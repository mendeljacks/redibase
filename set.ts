import { curry, reduce, slice, join, assoc, append, pathOr } from "ramda";
import { concat_if_nonexistent, path_to_key } from "./helpers/pure";
import { redis_get, redis_set } from "./helpers/redis/redis";

export const set = async (path, value, client) => {
    path = Array.isArray(path) ? path : [path]
    const relevant_redis_keys = path.map((el, i) => path_to_key(slice(0, i + 1, path)))
    const redis_data = relevant_redis_keys.length > 0 ? await redis_get(relevant_redis_keys, client) : {}
    // add entries to all the index lists of path elements
    const redis_updates = path.reduce(
        (acc, val, i) => {
            const path_fragment = slice(0, i + 1, path)
            const path_fragment_string = path_to_key(path_fragment)
            const user_val = pathOr(undefined, path_fragment, value)
            const existing_val = redis_data[path_fragment_string]
            const desired_val = i < path.length - 1 ? [path[i + 1]] : value

            if (Array.isArray(existing_val)) {
                const new_val = concat_if_nonexistent(existing_val || [], desired_val)
                return assoc(path_fragment_string, new_val, acc)
            }
            return assoc(path_fragment_string, desired_val, acc)
        }
    , {})
    await redis_set(redis_updates, client)

    // for each path el, check the redis entry that corresponds to that path. Check what is at that path. If it is already a list, add the next el to that
    // if it is not a list, set it to be a list with only that el
}

export const remove = (path, client) => {
    const relevant_data = []
    
}