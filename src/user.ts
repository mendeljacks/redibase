import { equals, isNil, keys, last, reduce, slice } from "ramda";
import { get_indexes, is_array, pairs_to_json, parse, path_to_key, strict_path_or, stringify, unpair } from "./pure";
import { evalsha, redis_commands } from "./redis";

const get_pairs_lua = async (root_key, client, { include_index_keys, max_layers }) => {
    
    const response: any = await evalsha('nested_get', [root_key, include_index_keys, max_layers], client)

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
    const add_to_index_commands = get_indexes(keys(given_child_pairs))
    await redis_commands([add_children_command, ...add_to_index_commands], client)
    client.publish('changes', stringify({ old: old_pairs, new: given_child_pairs }))

}

