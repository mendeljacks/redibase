import { toPairs, unnest } from 'ramda';

export const redis_get = (key_list: string[], client: any): Promise<any> => {
    return new Promise(function (resolve, reject) {
        client.mget(key_list, (err, res) => {
            if (err) return reject(err)
            resolve(res)
        })
    })

}
export const redis_delete = (key_list: string[], client: any): Promise<any> => {
    if (key_list.length === 0) return Promise.resolve(null)
    return Promise.all(key_list.map(key => {
        return new Promise(function (resolve, reject) {
            client.del(key, (err, res) => {
                client.publish('changes', {[key]: null});
                if (err) return reject(err)
                resolve(res)
            })
        });
    }))
}

export const redis_set = (obj, client) => {
    const params = unnest(toPairs(obj))
    return new Promise(function (resolve, reject) {
        client.publish('changes', obj);
        client.mset(params, (err, res) => {
            if (err) return reject(err)
            resolve(res)
        })
    })
}
