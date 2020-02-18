import { difference, equals, intersection, keys, pickAll, reject, type } from "ramda";
import { pairs_to_json, path_to_key } from "./pure";
import { redis_delete, redis_get, redis_set } from "./redis";

const get_pairs = async (paths: any[][], client) => {
    const keys_to_get = paths.map(path_to_key)
    const val = await redis_get(keys_to_get, client)
    return val
    // example should be to retrieve this when asking for root of the database
    /* {
        "animals.0.age": 2,
        "animals.0.name": "cow",
        "animals.1.age": 8.2,
        "animals.1.favorite_color": undefined,
        "animals.1.name": "sheep",
        "people.0.name": "john",
        "people.0.settings.likes_spam_email": false,
        "people.0.settings.mode": 1,
        "people.1.mood": "unknown",
        "people.1.name": "sandy"
    } */
}

export const user_get = async (path, client) => {
    const pairs = await get_pairs([path], client)
    return pairs_to_json(pairs)
}
export const user_delete = async (path, client) => {
    const pairs = await get_pairs(path, client)
    await redis_delete(keys(pairs),client)
}

export const user_set = async (path, given_pairs, client) => {
    const existing_pairs = await get_pairs([path], client)
    const new_keys = difference(keys(given_pairs), keys(existing_pairs))
    const missing_keys = difference(keys(existing_pairs), keys(given_pairs))
    const updated_keys = intersection(keys(existing_pairs), keys(given_pairs))
    const updated_keys_changed = reject(updated_key => equals(existing_pairs[updated_key], given_pairs[updated_key]))(updated_keys)

    await redis_delete(missing_keys,client)
    await redis_set(pickAll([...new_keys, ...updated_keys_changed])(given_pairs), client)

}



