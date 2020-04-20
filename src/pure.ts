import { adjust, chain, compose, curry, equals, fromPairs, has, hasPath, isEmpty, isNil, join, keys, map, path, reject, split, startsWith, test, toPairs, type, unnest, values } from 'ramda'
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
    const output = {}
    for (let i = 0; i < arr.length; i++) {
        if (i%2===0) {
            const key = arr[i];
            const val = arr[i+1];
            output[key] = val
        }
        
    }
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

export const get_indexes = (keys) => {
    const indexes = {}
    for (let i = 0; i < keys.length; i++) {
        const path_head = []
        const path_tail = key_to_path(keys[i])
        const len_path_tail = path_tail.length
        if (!indexes[""]) indexes[""] = {}
        indexes[""][path_tail[0]] = len_path_tail > 1 ? 'branch' : 'leaf'
        for (let j = 0; j < len_path_tail -1; j++) {
            path_head.push(path_tail.shift())
            const key = path_to_key(path_head)
            if (!indexes[key]) {
                indexes[key] = {}
            }
            indexes[key][path_tail[0]] = j === len_path_tail - 2 ? 'leaf' : 'branch'
        }
        
    }
    const output = Object.entries(indexes).map(entry => ['hmset', entry[0], entry[1]])
    return output
}

export const remove_subscriptions = (subscription_id, subscriptions) => {
    const subs = Object.entries(subscriptions)
    for (let i = 0; i < subs.length; i++) {
        const key = subs[i][0] 
        if (has(subscription_id)(subs[i][1])) {
            delete subscriptions[key][subscription_id]
            if (equals(subscriptions[key], {})) {
                delete subscriptions[key]
            }
        }

    }
    return subscriptions
}

export const on_msg = (subscriptions, channel, message) => {
    if (channel !== 'changes') return
    const changes = parse(message)
    const subscription_keys = keys(subscriptions)
    const new_keys = keys(changes.new)
    const old_keys = keys(changes.old)
    for (let i = 0; i < subscription_keys.length; i++) {
        const subscription_key = subscription_keys[i];
        const relevant_new_keys = new_keys.filter(new_key => startsWith(subscription_key, new_key))
        const relevant_old_keys = old_keys.filter(old_key => startsWith(subscription_key, old_key))
        if (relevant_new_keys.length > 0) {
            values(subscriptions[subscription_key]).forEach(fn => fn(
                relevant_new_keys.reduce((acc, val) => { acc[val] = changes.new[val]; return acc }, {}),
                relevant_old_keys.reduce((acc, val) => { acc[val] = changes.old[val]; return acc }, {})
            ))
        }
    }

}