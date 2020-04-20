import Redis from 'ioredis'
import { assocPath, curry } from 'ramda'
import * as shortid from 'shortid'
import { nested_get } from './lua'
import { concat_with_dot, json_to_pairs, key_to_path, map_keys, on_msg, path_to_key, remove_subscriptions } from './pure'
import { allowable_value_schema, key_or_path_schema } from './schemas'
import { user_delete, user_get, user_set } from './user'
const Shavaluator = require('redis-evalsha')


const connect = (connection_args, options = {}) => {
    // pass connection args directly to redis
    const client = new Redis(connection_args)
    client.__redibase_options__ = options

    // initialise the lua sha mechanism
    const shavaluator = new Shavaluator(client)
    client.__shavaluator__ = shavaluator
    shavaluator.add('nested_get', nested_get)

    // setup the subscriber to listen for changes
    const subscriber = new Redis(connection_args)
    let subscriptions = {}
    subscriber.subscribe('changes')
    subscriber.on("message", (channel, message) => on_msg(subscriptions, channel, message))

    // return the redibase object to users
    return {
        get: (key: string | any[]) => {
            const { error } = key_or_path_schema.validate(key);
            if (error) return Promise.reject(error)
            return user_get(key_to_path(key), client)
        },
        set: curry((path: string | any[], json) => {
            const { error: path_error } = key_or_path_schema.validate(path)
            const { error: json_error } = allowable_value_schema.validate(json)
            if (path_error) return Promise.reject(path_error)
            if (json_error) return Promise.reject(json_error)
            const user_pairs = json_to_pairs(json)
            return user_set(key_to_path(path), map_keys(concat_with_dot(path_to_key(path)))(user_pairs), client)
        }),
        delete: async (key: string | any[]) => {
            const { error } = key_or_path_schema.validate(key);
            if (error) return Promise.reject(error)
            await user_delete(key_to_path(key), client, false)
        },
        quit: () => client.quit(),
        on: (path: string | any[], cb) => {
            const subscription_id = shortid.generate()
            subscriptions = assocPath([path_to_key(path), subscription_id], cb)(subscriptions)
            return subscription_id
        },
        off: (subscription_id) => {
            subscriptions = remove_subscriptions(subscription_id, subscriptions)
        },
        client
    }
}
export { connect }

