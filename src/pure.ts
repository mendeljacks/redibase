import { adjust, assocPath, chain, compose, concat, curry, dropLast, equals, fromPairs, hasPath, includes, isEmpty, isNil, join, keys, last, map, mergeAll, mergeWithKey, path, reduce, reject, slice, split, startsWith, test, toPairs, toString, type, uniq, unnest, values, without, zipObj } from "ramda";
const serialize = require('serialize-javascript')

export const is_array = el => type(el) === 'Array'
export const is_object = el => type(el) === 'Object'
export const is_array_or_object = el => type(el) === 'Array' || type(el) === 'Object'
const ensure_is_array = value => is_array(value) ? value : [value]

export const is_numeric_string = test(/^0$|^[1-9][0-9]*$/)
export const path_to_key = path => type(path) === "Array" ? path.join('.') : path
export const key_to_path = path => type(path) === "String" ? compose(map(el => is_numeric_string(el) ? Number(el) : el), split('.'))(path) : path

export const stringify = (value: any): string => serialize(value, { ignoreFunction: true })
export const parse = (serializedJavascript: string): any => eval('(' + serializedJavascript + ')')

export const concat_if_nonexistent = (arr1, arr2) => uniq([...arr1, ...arr2])
export const concat_with_dot = curry((a, b) => compose(
    join('.'),
    reject(isEmpty)
)([a, b]))
export const unpair = arr => zipObj(arr.filter((a, i) => i % 2 === 0), arr.filter((a, i) => i % 2 === 1))
const json_to_path_list = (val) => {
    if (is_array(val)) {
        const child_paths = unnest(val.map((child, i) =>
            json_to_path_list(child).map(path => [i, ...path])
        ))
        return child_paths
    }

    if (is_object(val)) {
        const child_paths = chain((key, i) =>
            json_to_path_list(val[key]).map(path => [key, ...path])
        )(keys(val))
        return child_paths
    }
    return [[]]

}

export const who_cares = (changes, subscriptions): [{ changed_key: string; fns: any[]; new: any; old: any; watched_key: string }] => {
    return reduce((acc, val) => {
        const changed_key = val
        const new_pairs = changes.new[changed_key]
        const old_pairs = changes.old[changed_key]
        const relevant_subscription_keys = keys(subscriptions).filter(key => startsWith(key)(changed_key))
        return concat(
            relevant_subscription_keys.map(watched_key => {
                const fns = values(subscriptions[watched_key])
                return { watched_key, changed_key, new: new_pairs, old: old_pairs, fns }
            }),
            acc
        )

    }, [])(keys({ ...changes.old, ...changes.new }))

}

// like pathOr but doesnt return null when value is null and not undefined
export const strict_path_or = (default_val, val_path, obj) => {
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
        return { ...acc, [redis_key]: redis_value }
    }, {})(path_list)
}

export const pairs_to_json = pairs => {
    let output = {}
    const paths = compose(map(key => ({ path: key_to_path(key), val: pairs[key] })), keys)(pairs)
    paths.map(path_el => output = assocPath(path_el.path, path_el.val, output))
    return output
}

export const map_keys = curry((fn, obj) => fromPairs(map(adjust(0, fn), toPairs(obj))))



export const delete_parent_indices = (missing_paths, data) => {

    const output = reduce((acc, val) => {
        const old_index = acc[path_to_key(dropLast(1, val))]
        if (isNil(old_index)) return acc
        const new_index = without(toString(last(val)))(old_index)
        const key_to_update = path_to_key(dropLast(1, val))
        const update_obj = { ...acc, [key_to_update]: new_index }
        return update_obj
    }, data, missing_paths)

    return output
}


const parent_keys = shpath => shpath.length > 0 && !equals(shpath, ['']) ? shpath.map((el, i) => ({ [path_to_key(slice(0, i, shpath))]: key_to_path(shpath)[i] })) : []

export const get_required_indexes = (key_list) => {
    const required_indexes = reduce((acc, val) => {
        const pkeys = compose(mergeAll, parent_keys, key_to_path)(val)
        const left = map(ensure_is_array)(acc)
        const right = map(ensure_is_array)(pkeys)
        return mergeWithKey((k, l, r) => concat_if_nonexistent(l, r))(left, right)
    }, {})(key_list)

    const indexes_to_add_for_given_key = (key, required_indexes, key_list) => {
        return mergeAll(required_indexes[key].map(el => ({ [el]: includes(concat_with_dot(key, el), key_list) ? 'leaf' : 'branch' })))
    }

    const commands = map(key => ['hmset', key, indexes_to_add_for_given_key(key, required_indexes, key_list)])(keys(required_indexes))
    return commands
}