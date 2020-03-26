import { addIndex, compose, equals, filter, isEmpty, isNil, keys, last, map, reduce, slice, unnest, zipObj } from "ramda";
import { concat_with_dot, get_required_indexes, is_array, pairs_to_json, parse, path_to_key, strict_path_or, stringify, unpair } from "./pure";
import { redis_commands } from "./redis";

const get_pairs_lua = async (branch_keys, leaf_keys, output, client, { include_index_keys, max_layers }, current_layer) => {
    const query_string = `
    local ternary = function ( cond , T , F ) if cond then return T() else return F() end end
    local map = function(func, array) local new_array = {} for i,v in ipairs(array) do new_array[i] = func(v) end return new_array end
    local filter = function(fn, t) local out = {} for k, v in pairs(t) do if fn(k, v) then out[k] = v end end return out end
    local function to_pairs(obj) 
        local keyset={}
        local n=0
        for k,v in pairs(obj) do
            n=n+2
            keyset[n-1]=k
            keyset[n]=v
        end
        return keyset
    end
    local concat_with_dot = function (a, b) if a == '' then return b end return a .. '.' .. b end
    local prefix = function (str) return 'redibase_' .. str end
    
    local function get_pairs(branch_keys, leaf_keys, output, options, current_layer) 
        local include_index_keys = options.include_index_keys
        local max_layers = options.max_layers
        
        while ((current_layer ~= max_layers) and not (#branch_keys == 0 and #leaf_keys == 0)) do
            local leaf_results = ternary(#leaf_keys > 0, function () return redis.call('mget', unpack(map(prefix, leaf_keys))) end, function () return {} end)
            local branch_results = ternary(#branch_keys > 0, function () return map(function (bk) 
                        local prefixed = prefix(bk) 
                        return redis.call('hgetall', prefixed) 
                    end, branch_keys) end, function () return {} end)
            local next_branch_keys = {}
            local next_leaf_keys = {}
            for i,branch_key in ipairs(branch_keys) do
                for j, val in ipairs(branch_results[i]) do
                    if j % 2 == 1 then
                        local next_key = concat_with_dot(branch_key, val)
                        local next_key_type = branch_results[i][j+1]
                        if next_key_type == 'branch' then table.insert(next_branch_keys, next_key) end
                        if next_key_type == 'leaf' then table.insert(next_leaf_keys, next_key) end
                    end
                end
            end
            local new_output = output
            if include_index_keys then
                for i = 1, #branch_keys do
                    new_output[branch_keys[i]] = branch_results[i]
                end
            end
            for i = 1, #leaf_keys do
                new_output[leaf_keys[i]] = leaf_results[i]
            end
            
            branch_keys = next_branch_keys
            leaf_keys = next_leaf_keys
            output = new_output
            current_layer = current_layer + 1
        end
        return output
    end
    local x = get_pairs({${branch_keys.map(el => `"${el}"`)}}, {${leaf_keys.map(el => `"${el}"`)}}, {}, { include_index_keys=${include_index_keys}, max_layers=${max_layers} }, 0)
    return to_pairs(x)
`
    const [response] = await redis_commands([['eval', query_string, 0]], client)
    const unpaired_indexes = response.map((el, i) => {
        if (i % 2 === 0) return el
        return is_array(el) ? unpair(el) : parse(el)
    })
    const sanitized = unpair(unpaired_indexes)
    return sanitized

}

const nested_get = async (path: [string | number], client, { include_index_keys, max_layers }) => {
    const key = path_to_key(path)
    const [entry_point_node_type] = await redis_commands([['type', key]], client)
    if (entry_point_node_type === 'none') return {key: null}
    const branch_keys = entry_point_node_type === 'hash' ? [key] : []
    const leaf_keys = entry_point_node_type === 'hash' ? [] : [key]
    const pairs = await get_pairs_lua(branch_keys, leaf_keys, {}, client, { include_index_keys, max_layers }, 0)
    // const pairs = await get_pairs(branch_keys, leaf_keys, {}, client, { include_index_keys, max_layers }, 0)
    return pairs
}

const get_pairs = async (branch_keys, leaf_keys, output, client, { include_index_keys, max_layers }, current_layer) => {
    if (current_layer === max_layers) return output

    const [leaf_results, branch_results] = await Promise.all([
        leaf_keys.length > 0 ? redis_commands([['mget', ...leaf_keys]], client).then(unnest) : Promise.resolve([]),
        branch_keys.length > 0 ? redis_commands(branch_keys.map(bk => ['hgetall', bk]), client) : Promise.resolve([])
    ])

    const next_keys = key_type => compose(
        unnest,
        addIndex(map)((branch_key, i) => {
            const branch_indices = filter(equals(key_type), branch_results[i])
            return keys(branch_indices).map(concat_with_dot(branch_key))
        })
    )(branch_keys)

    const next_branch_keys = next_keys('branch')
    const next_leaf_keys = next_keys('leaf')

    const new_branch_output = zipObj(branch_keys, branch_results)
    const new_leaf_output = zipObj(leaf_keys, leaf_results)

    const new_output = include_index_keys
        ? { ...output, ...new_leaf_output, ...new_branch_output }
        : { ...output, ...new_leaf_output }

    if (isEmpty(next_branch_keys) && isEmpty(next_leaf_keys)) return new_output
    return get_pairs(next_branch_keys, next_leaf_keys, new_output, client, { include_index_keys, max_layers }, current_layer + 1)

}

export const user_get = async (path, client) => {
    const pairs = await nested_get(path, client, { include_index_keys: false, max_layers: -1 })
    const json_obj = compose(pairs_to_json)(pairs)
    const output = equals(path, [""]) ? json_obj : strict_path_or(undefined, path, json_obj)
    return output
}
export const user_delete = async (path, client, quiet) => {
    const pairs = await nested_get(path, client, { include_index_keys: true, max_layers: -1 })

    const todo = [['del', ...keys(pairs)]]

    if (!equals(path, [""])) {
        const one_layer_up = await nested_get(slice(0, -1)(path), client, { include_index_keys: true, max_layers: 1 })

        // remove the one key from the index
        if (!isNil(one_layer_up)) {
            const last_el = last(path)
            const key_to_update = path_to_key(slice(0, -1)(path))
            todo.push(['hdel', key_to_update, last_el])
        }
    }

    await redis_commands(todo, client)
    if (quiet) return pairs
    client.publish('changes', stringify({ old: pairs, new: reduce((acc, val) => ({ ...acc, [val]: null }), {}, keys(pairs)) }))
    return pairs
}

export const user_set = async (path, given_child_pairs, client) => {
    const old_pairs = await user_delete(path, client, true)
    const add_children_command = ['mset', given_child_pairs]
    const add_to_index_commands = get_required_indexes(keys(given_child_pairs))
    await redis_commands([add_children_command, ...add_to_index_commands], client)

    client.publish('changes', stringify({ old: old_pairs, new: given_child_pairs }))

}

