import { compose, equals, isNil, keys, last, reduce, slice, unnest, addIndex, map, filter, zipObj, isEmpty } from "ramda";
import { get_required_indexes, pairs_to_json, path_to_key, strict_path_or, stringify, concat_with_dot } from "./pure";
import { redis_commands } from "./redis";

const nested_get = async (path: [string | number], client, { include_index_keys, max_layers }) => {
    const key = path_to_key(path)
    const [entry_point_node_type] = await redis_commands([['type', key]], client)
    const branch_keys = entry_point_node_type === 'hash' ? [key] : []
    const leaf_keys = entry_point_node_type === 'hash' ? [] : [key]
    return get_pairs(branch_keys, leaf_keys, {}, client, { include_index_keys, max_layers }, 0)
}

// current_layer = 1
// "" => {people: 'branch', animals: 'branch'}

// // current_layer = 2
// "people" => {0: 'branch', 1: 'branch'}
// "animals" => {0: 'branch', 1: 'branch', 2: 'branch'}

// // current_layer = 3
// 'people.0' => {name: 'leaf', age: 'leaf'}
// 'people.1' => {name: 'leaf', settings: 'branch'}
// 'animals.0'
// 'animals.1'
// 'animals.2'

// // current_layer = 4
// 'people.0.name'

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
    if (quiet) return pairs
    client.publish('changes', stringify({ old: pairs_to_json(pairs), new: null }))
    return pairs
}

export const user_set = async (path, given_child_pairs, client) => {
    const old_pairs = await user_delete(path, client, true)
    const add_children_command = ['mset', given_child_pairs]
    const add_to_index_commands = get_required_indexes(keys(given_child_pairs))
    await redis_commands([add_children_command, ...add_to_index_commands], client)

    client.publish('changes', stringify({ old: pairs_to_json(old_pairs), new: pairs_to_json(given_child_pairs) }))

}

