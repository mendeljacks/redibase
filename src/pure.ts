import { adjust, chain, compose, curry, dropLast, equals, fromPairs, has, hasPath, includes, isEmpty, isNil, join, keys, last, map, mergeAll, path, reduce, reject, slice, split, test, toPairs, toString, type, uniq, unnest, without } from "ramda";
const serialize = require('serialize-javascript')

export const is_array = el => type(el) === 'Array'
export const is_object = el => type(el) === 'Object'
export const is_array_or_object = el => type(el) === 'Array' || type(el) === 'Object'

export const is_numeric_string = test(/^0$|^[1-9][0-9]*$/)
export const path_to_key = path => type(path) === "Array" ? path.join('.') : path
export const key_to_path = path => type(path) === "String" ? compose(map(el => is_numeric_string(el) ? Number(el) : el), split('.'))(path) : path

export const stringify = (value: any): string => serialize(value, { ignoreFunction: true })
export const parse = (serializedJavascript: string): any => eval('(' + serializedJavascript + ')')

export const concat_with_dot = curry((a, b) => compose(
    join('.'),
    reject(isEmpty)
)([a, b]))
export const unpair = arr => {
    // convert [key1,val1,key2,val2] to {key1:val1, key2:val2}
    // console.time('v1')
    // eslint-disable-next-line prefer-const
    let output = {}
    for (let i = 0; i < arr.length; i++) {
        if (i%2===0) {
            const key = arr[i];
            const val = arr[i+1];
            output[key] = val
        }
        
    }
    // console.timeEnd('v1')
    // console.time('v2')
    // const output2 = zipObj(arr.filter((a, i) => i % 2 === 0), arr.filter((a, i) => i % 2 === 1))
    // console.timeEnd('v2')
    return output
}
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
    const output = path_list.reduce((acc, val, i) => {
        const redis_key = path_to_key(val)
        const given_value = strict_path_or(undefined, val, json)
        const redis_value = is_array_or_object(given_value) ? keys(given_value) : given_value
        acc[redis_key] = redis_value
        return acc
    }, {})
    return output
}


const _isInteger = (n) => {return (n << 0) === n;} // copied from ramda
const assocPathfast = function assocPath(path, val, obj) {
    // eslint-disable-next-line prefer-const
    let idx = path[0];
    if (path.length > 1) {
        // eslint-disable-next-line prefer-const
        let nextObj = (!isNil(obj) && has(idx, obj)) ? obj[idx] : _isInteger(path[1]) ? [] : {};
        val = assocPath(Array.prototype.slice.call(path, 1), val, nextObj);
    }
    if (_isInteger(idx) && is_array(obj)) {
        // eslint-disable-next-line prefer-const
        let arr = [].concat(obj);
        arr[idx] = val;
        return arr;
    } else {
        obj[idx] = val
        return obj

    }
}

export const pairs_to_json = pairs => {
    let output = {}
    const paths = compose(map(key => ({ path: key_to_path(key), val: pairs[key] })), keys)(pairs)
    for (let i = 0; i < paths.length; i++) {
        const path_el = paths[i];
        output = assocPathfast(path_el.path, path_el.val, output)
    }
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
    // eslint-disable-next-line prefer-const
    let required_indexes = {}
    for (let i = 0; i < key_list.length; i++) {
        const val = key_list[i];
        const pkeys = compose(parent_keys, key_to_path)(val)

        for (let j = 0; j < pkeys.length; j++) {
            const key = Object.keys(pkeys[j])[0]
            const val = Object.values(pkeys[j])[0]
            required_indexes[key] = uniq([...(required_indexes[key] || []), val])

        }

    }

    const indexes_to_add_for_given_key = (key, required_indexes, key_list) => {
        return mergeAll(required_indexes[key].map(el => ({ [el]: includes(concat_with_dot(key, el), key_list) ? 'leaf' : 'branch' })))
    }

    const commands = map(key => ['hmset', key, indexes_to_add_for_given_key(key, required_indexes, key_list)])(keys(required_indexes))
    return commands
}