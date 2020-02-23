import { compose, concat, isNil, keys, map, toPairs, unnest } from 'ramda'
import { map_keys, parse, stringify, key_to_path } from './pure'

export const redis_get = (key_list: string[], client: any): Promise<any[]> => {
    const decorated_keys = key_list.map(concat('redibase_'))
    return client.mget(decorated_keys).then(res => res.map(el => isNil(el) ? el : parse(el)))
}
export const redis_delete = async (key_list: string[], client: any): Promise<any> => {
    if (key_list.length === 0) return Promise.resolve('nothing to do')
    const decorated_keys = key_list.map(concat('redibase_'))
    client.publish('changes', stringify(key_list.map(key => ({[key]: null}))))
    return client.del(decorated_keys)
}
export const redis_set = (obj, client) => {
    if (keys(obj).length === 0) return Promise.resolve('nothing to do')
    const decorated = compose(map_keys(concat('redibase_')), map(stringify))(obj)
    client.publish('changes', stringify(obj))
    return client.mset(decorated)
}
