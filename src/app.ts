import { curry } from 'ramda'
import * as redis from 'redis'
import { key_to_path, json_to_pairs } from './pure'
import { key_or_path_schema } from './schemas'
import { user_delete, user_get, user_set } from './user'

const connect = (connection_args) => {
    const client = redis.createClient(connection_args)
    return {
        get: (key: string | any []) => {
            const { error } = key_or_path_schema.validate(key);
            if (error) return Promise.reject(error)
            return user_get(key_to_path(key), client)
        },
        set: curry((path: string | any [], json) => {
            const { error } = key_or_path_schema.validate(path);
            if (error) return Promise.reject(error)        
            return user_set(key_to_path(path), mapKeys(concat(path_to_key(path)))(json_to_pairs(json)), client)
        }),
        delete: (key: string | any []) => {
            const { error } = key_or_path_schema.validate(key);
            if (error) return Promise.reject(error)
            user_delete(key_to_path(key), client)
        },
        quit: () => client.quit()
    }
}
export { connect }

