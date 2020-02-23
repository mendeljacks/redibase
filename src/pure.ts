import { adjust, assocPath, chain, compose, concat, curry, fromPairs, hasPath, isEmpty, join, assoc, keys, map, path, reduce, reject, split, test, toPairs, type, uniq, unnest } from "ramda";
var serialize = require('serialize-javascript')

export const is_array = el => type(el) === 'Array'
export const is_object = el => type(el) === 'Object'
export const is_array_or_object = el => type(el) === 'Array' || type(el) === 'Object'

export const is_numeric_string = test(/^0$|^[1-9][0-9]*$/)
export const path_to_key = path => type(path) === "Array" ? path.join('.') : path
export const key_to_path = path => type(path) === "String" ? compose(map(el => is_numeric_string(el) ? Number(el) : el), split('.'))(path) : path

export const stringify = (value: any): string => serialize(value, { ignoreFunction: true })
export const parse = (serializedJavascript: string): any => eval('(' + serializedJavascript + ')')

export const concat_if_nonexistent = (array, append_array) => compose(uniq, concat(array))(append_array)

// returns new_pairs with all the index values from existing_pairs merged in
export const merge_keys = (existing_pairs, new_pairs, keys) => reduce((acc, val) => {
    const existing_value = existing_pairs[val] || []
    const new_value = new_pairs[val] || []

    if (!Array.isArray(existing_value) || !Array.isArray(new_value)) {
        return assoc(val, new_value, acc)
    } else {
        const merged_value = concat_if_nonexistent(existing_value, new_value)
        return assoc(val, merged_value, acc)
    }
  }, new_pairs)(keys)

const json_to_path_list = (val) => {
    if (Array.isArray(val)) {
        const child_paths = unnest(val.map((child, i) =>
            json_to_path_list(child).map(path => [i, ...path])
        ))
         
        return concat([[]], child_paths)
    }

    if (is_object(val)) {
        const child_paths = compose(
            concat([[]]),
            chain((key, i) =>
                json_to_path_list(val[key]).map(path => [key, ...path])
            )
        )(keys(val))
        return child_paths
    }
    return [[]]
}

// like pathOr but doesnt return default when the value is null
const strict_path_or = (default_val, val_path, obj) => {
    if (val_path.length === 0) {
        return obj
    }
    if (hasPath(val_path, obj)) {
        return path(val_path, obj)
    } else {
        return default_val
    }
}

export const json_to_pairs = (json) => {
    const path_list = json_to_path_list(json)
    return reduce((acc, val) => {
        const redis_key = path_to_key(val)
        const given_value = strict_path_or(undefined, val, json)
        const redis_value = is_array_or_object(given_value) ? keys(given_value) : given_value 
        return { ...acc, [redis_key]: redis_value}
    }, {})(path_list)
}

export const pairs_to_json = pairs => {
    let output = {}
    const paths = compose(map(key => ({ path: key_to_path(key), val: pairs[key] })), keys)(pairs)
    paths.map(path_el => output = assocPath(path_el.path, path_el.val, output))
    return output
}

export const map_keys = curry((fn, obj) => fromPairs(map(adjust(0, fn), toPairs(obj))))

export const concat_with_dot = curry((a, b) => compose(
    join('.'),
    reject(isEmpty)
)([a, b]))