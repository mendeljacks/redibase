import { compose, concat, isNil, keys, map, toPairs, unnest } from 'ramda'
import { map_keys, parse, stringify, key_to_path } from './pure'

export const redis_get = (key_list: string[], client: any): Promise<any[]> => {
    const decorated_keys = key_list.map(concat('redibase_'))
    return client.mget(decorated_keys).then(res => res.map(el => isNil(el) ? el : parse(el)))
}
export const redis_delete = async (old_pairs, key_list: string[], client: any): Promise<any> => {
    if (key_list.length === 0) return Promise.resolve('nothing to do')
    const decorated_keys = key_list.map(concat('redibase_'))
    client.publish('changes', stringify({ old_pairs, new_pairs: key_list.map(key => ({[key]: null})) }))
    return client.del(decorated_keys)
}
export const redis_set = (old_pairs, new_pairs, client) => {
    if (keys(new_pairs).length === 0) return Promise.resolve('nothing to do')
    const decorated = compose(map_keys(concat('redibase_')), map(stringify))(new_pairs)
    client.publish('changes', stringify({ old_pairs, new_pairs }))
    return client.mset(decorated)
}
