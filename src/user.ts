import { compose, difference, equals, filter, head, intersection, keys, last, map, pathOr, pickAll, reject, toPairs, unnest, zipObj, dropLast } from "ramda";
import { is_array, pairs_to_json, path_to_key, is_numeric_string, key_to_path } from "./pure";
import { redis_delete, redis_get, redis_set } from "./redis";

const nested_get = async (path: [string | number], client, {include_index_keys}) => {
    return get_pairs([path_to_key(path)], {}, client, include_index_keys)
}

const get_pairs = async (key_list, output, client, include_index_keys) => {
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
    return get_pairs(sub_keys, new_output, client, include_index_keys)

}

export const user_get = async (path, client) => {
    const pairs = await nested_get(path, client, {include_index_keys: false})
    const json_obj = compose(pairs_to_json)(pairs)
    const output = equals(path, [""]) ? json_obj :pathOr(undefined, path)(json_obj)
    return output
}
export const user_delete = async (path, client) => {
    const pairs = await nested_get(path, client, {include_index_keys: true})
    await redis_delete(keys(pairs), client)
}

export const user_set = async (path, given_pairs, client) => {
    const existing_pairs = await nested_get(path, client, {include_index_keys: true})
    const new_keys = difference(keys(given_pairs), keys(existing_pairs))
    const missing_keys = difference(keys(existing_pairs), keys(given_pairs))
    const updated_keys = intersection(keys(existing_pairs), keys(given_pairs))
    const updated_keys_changed = reject(updated_key => equals(existing_pairs[updated_key], given_pairs[updated_key]))(updated_keys)

    await redis_delete(missing_keys, client)
    const set_obj = pickAll([...new_keys, ...updated_keys_changed])(given_pairs)
    await redis_set(set_obj, client)

}



