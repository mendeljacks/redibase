import { all, compose, difference, equals, filter, head, intersection, keys, last, map, pathOr, pickAll, reject, slice, toPairs, unnest, zipObj } from "ramda";
import { is_array, pairs_to_json, path_to_key, is_numeric_string } from "./pure";
import { redis_delete, redis_get, redis_set } from "./redis";

const nested_get = async (path: [string | number], client, {include_index_keys, max_layers}) => {
    return get_pairs([path_to_key(path)], {}, client, include_index_keys, 0, max_layers)
}

const get_pairs = async (key_list, output, client, include_index_keys, current_layer, max_layers) => {
    if (current_layer === max_layers) return output
    const value_list = await redis_get(key_list, client)

    const found_values = zipObj(key_list, value_list)
    const sub_keys = compose(
        unnest,
        map(pair =>
            map(index_end =>
                head(pair) + `${head(pair) === "" ? '' : '.'}` + index_end
            )(last(pair))),
        toPairs,
        filter(is_array)
    )(found_values)
    const new_output = { ...output, ...(include_index_keys ? found_values : reject(is_array)(found_values)) }
    if (sub_keys.length === 0) return new_output
    return get_pairs(sub_keys, new_output, client, include_index_keys, current_layer + 1, max_layers)

}

export const user_get = async (path, client) => {
    const pairs = await nested_get(path, client, {include_index_keys: false, max_layers: -1})
    const json_obj = compose(pairs_to_json)(pairs)
    const output = equals(path, [""]) ? json_obj :pathOr(undefined, path)(json_obj)
    return output
}
export const user_delete = async (path, client) => {
    if (!equals(path, [""])) {
        const one_layer_up = await nested_get(slice(0,-1)(path), client, {include_index_keys: true, max_layers: 1})
        

        
        if (all(is_numeric_string)(one_layer_up)) {
            // fill_holes
            // debugger
        } else {
            // remove the one key from the index
            // debugger
        }
    }
    const pairs = await nested_get(path, client, {include_index_keys: true, max_layers: -1})
    await redis_delete(keys(pairs), client)
}

export const user_set = async (path, given_pairs, client) => {
    const existing_pairs = await nested_get(path, client, {include_index_keys: true, max_layers: -1})
    const new_keys = difference(keys(given_pairs), keys(existing_pairs))
    const missing_keys = difference(keys(existing_pairs), keys(given_pairs))
    const updated_keys = intersection(keys(existing_pairs), keys(given_pairs))
    const updated_keys_changed = reject(updated_key => equals(existing_pairs[updated_key], given_pairs[updated_key]))(updated_keys)

    await redis_delete(missing_keys, client)
    const set_obj = pickAll([...new_keys, ...updated_keys_changed])(given_pairs)
    await redis_set(set_obj, client)

}
 


