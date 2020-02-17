import { curry, reduce, slice, join, assoc, append, pathOr } from "ramda";
import { concat_if_nonexistent, redis_read } from "./helpers/pure";

export const set = curry((path, value) => {
    const redis_data = redis_read()
    // add entries to all the index lists of path elements
    const redis_updates = path.reduce(
        (acc, val, i) => {
            const path_fragment = slice(0, i + 1, path)
            const path_fragment_string = join('.', path_fragment)
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
    return redis_updates

    // for each path el,  check the redis entry that corresponds to that path. Check what is at that path. If it is already a list, add the next el to that
    // if it is not a list, set it to be a list with only that el
})