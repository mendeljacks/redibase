import { compose, concat, isNil, map, toPairs, unnest } from 'ramda'
import { map_keys, parse, stringify } from './pure'

export const redis_get = (key_list: string[], client: any): Promise<any[]> => {
    const decorated_keys = key_list.map(concat('redibase_'))
    return new Promise(function (resolve, reject) {
        client.mget(decorated_keys, (err, res) => {
            if (err) return reject(err)
            resolve(res.map(el => isNil(el) ? el : parse(el)))
        })
    })

}
export const redis_delete = async (key_list: string[], client: any): Promise<any> => {
    if (key_list.length === 0) return Promise.resolve(null)

    const decorated_keys = key_list.map(concat('redibase_'))

    const results = await new Promise((resolve, reject) => {
        client.del(decorated_keys, (err, res) => {
            if (err) {
                return reject(err)
            }
            resolve(res)
        })
    })

    // const results = await Promise.all(key_list.map(key => {
    //     const decorated_key = concat('redibase_')(key)

    //     return new Promise((resolve, reject) => {
    //         client.del([decorated_key], (err, res) => {
    //             if (err) {
    //                 return reject(err)
    //             }
    //             resolve(res)
    //         })
    //     })
    // }))

    return results
}

export const redis_set = (obj, client) => {
    const decorated = compose(map_keys(concat('redibase_')), map(stringify))(obj)
    const params = unnest(toPairs(decorated))
    return new Promise(function (resolve, reject) {
        client.mset(params, (err, res) => {
            if (err) return reject(err)
            resolve(res)
        })
    })
}
