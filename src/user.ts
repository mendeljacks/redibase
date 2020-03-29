import { compose, equals, isNil, keys, last, pathOr,  reduce, slice } from "ramda";
import { get_required_indexes, is_array, pairs_to_json, parse, path_to_key, strict_path_or, stringify, unpair } from "./pure";
import { redis_commands } from "./redis";

const get_pairs_lua = async (root_key, client, { include_index_keys, max_layers }) => {
    const query_string = `
    local call_in_chunks = function (command, args)
    local step = 1000
    local output = {}
    for i = 1, #args, step do
        local result = redis.call(command, unpack(args, i, math.min(i + step - 1, #args)))
        for j = 1, #result do
            table.insert(output, result[j])
        end
    end
    return output
end
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
            local leaf_results = ternary(#leaf_keys > 0, 
                function () 
                    return call_in_chunks('mget', map(prefix, leaf_keys)) 
                end, 
                function () 
                    return {} 
                end)
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
            if include_index_keys == 'true' then
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
    local root_key = KEYS[1]
    local root_key_type = redis.call('type', prefix(root_key)).ok
    local branch_keys = {}
    local leaf_keys = {}
    if root_key_type == 'hash' then
        table.insert(branch_keys, root_key)
    else
        table.insert(leaf_keys, root_key)
    end
    local x = get_pairs(branch_keys, leaf_keys, {}, { include_index_keys=KEYS[2], max_layers=KEYS[3] }, 0)
    return to_pairs(x)

`
    const [response] = await redis_commands([['eval', query_string, 3, root_key, include_index_keys, max_layers]], client)
    const unpaired_indexes = response.map((el, i) => {
        if (i % 2 === 0) return el
        return is_array(el) ? unpair(el) : parse(el)
    })
    const sanitized = unpair(unpaired_indexes)
    return sanitized

}


export const user_get = async (path, client) => {
    const pairs = await get_pairs_lua(path_to_key(path), client, {include_index_keys: false, max_layers: -1})
    const json_obj = pairs_to_json(pairs)
    const output = equals(path, [""]) ? json_obj : strict_path_or(undefined, path, json_obj)
    return output
}
export const user_delete = async (path, client, quiet) => {
    const pairs = await get_pairs_lua(path_to_key(path), client, {include_index_keys: true, max_layers: -1})

    const todo = [['del', ...keys(pairs)]]

    if (!equals(path, [""])) {
        const one_layer_up = await get_pairs_lua(path_to_key(slice(0, -1)(path)), client, { include_index_keys: true, max_layers: 1 })

        // remove the one key from the index
        if (!isNil(one_layer_up)) {
            const last_el = last(path)
            const key_to_update = path_to_key(slice(0, -1)(path))
            todo.push(['hdel', key_to_update, last_el])
        }
    }

    await redis_commands(todo, client)
    if (quiet) return pairs
    client.publish('changes', stringify({ old: pairs, new: reduce((acc, val) => { acc[val] = null; return acc}, {}, keys(pairs)) }))
    return pairs
}

export const user_set = async (path, given_child_pairs, client) => {
    const old_pairs = await user_delete(path, client, true)
    const add_children_command = ['mset', given_child_pairs]
    const add_to_index_commands = get_required_indexes(keys(given_child_pairs))
    await redis_commands([add_children_command, ...add_to_index_commands], client)
    client.publish('changes', stringify({ old: old_pairs, new: given_child_pairs }))

}

