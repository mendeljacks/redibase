import { compose, difference, dropLast, reduce, equals, filter, head, intersection, isNil, keys, last, map, mergeAll, pickAll, prop, reject, slice, toPairs, toString, unnest, without, zipObj } from "ramda";
import { delete_parent_indices, is_array, key_to_path, merge_keys, pairs_to_json, path_to_key, strict_path_or, stringify, get_required_indexes } from "./pure";
import { redis_commands } from "./redis";

const nested_get = async (path: [string | number], client, { include_index_keys, max_layers }) => {
    const key = path_to_key(path)
    const [entry_point_node_type] = await redis_commands([['type', key]], client)
    const branch_keys = entry_point_node_type === 'hash' ? [key] : []
    const leaf_keys = entry_point_node_type === 'hash' ? [] : [key]
    return get_pairs(branch_keys, leaf_keys, {}, client, {include_index_keys, max_layers}, 0)
}

const get_pairs = async (branch_keys, leaf_keys, output, client, {include_index_keys, max_layers}, current_layer) => {
    if (current_layer === max_layers) return output
        
    const [leaf_results, branch_results] = await Promise.all([    
        leaf_keys.length > 0 ? redis_commands([['mget', ...leaf_keys]], client) : Promise.resolve(),
        branch_keys.length > 0 ? redis_commands(branch_keys.map(bk=>['hgetall', bk]), client) : Promise.resolve()
    ])

    // const found_values = zipObj(key_list, value_list)
    // const sub_keys = compose(
    //     unnest,
    //     map(pair =>
    //         map(index_end =>
    //             head(pair) + `${head(pair) === "" ? '' : '.'}` + index_end
    //         )(last(pair))),
    //     toPairs,
    //     filter(is_array)
    // )(found_values)
    // const new_output = { ...output, ...(include_index_keys ? found_values : reject(is_array)(found_values)) }
    if (sub_keys.length === 0) return new_output
    return get_pairs(next_branch_keys, next_leaf_keys, new_output, client, {include_index_keys, max_layers}, current_layer + 1)

}

export const user_get = async (path, client) => {
    const pairs = await nested_get(path, client, { include_index_keys: false, max_layers: -1 })
    const json_obj = compose(pairs_to_json)(pairs)
    const output = equals(path, [""]) ? json_obj : strict_path_or(undefined, path, json_obj)
    return output
}
export const user_delete = async (path, client, quiet) => {
    const pairs = await nested_get(path, client, { include_index_keys: true, max_layers: -1 })
    
    var todo = [['del', ...keys(pairs)]]

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
    if (quiet) return
    client.publish('changes', stringify({ old_pairs: pairs, new_pairs: reduce((acc, val) => ({ ...acc, [val]: null }), {}, keys(pairs)) }))
}

export const user_set = async (path, given_child_pairs, client) => {
    await user_delete(path, client, true)
    const add_children_command = ['mset', given_child_pairs]
    const add_to_index_commands = get_required_indexes(keys(given_child_pairs))
    await redis_commands([add_children_command, ...add_to_index_commands], client)

    client.publish('changes', stringify({ old_pairs: {}, new_pairs: given_child_pairs }))

}



