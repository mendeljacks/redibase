import { path_to_key } from "../pure/path_to_key";
import { unnest, toPairs } from 'ramda'

export const redis_get = (key_list: string[], client: any): Promise<any> => {

    return new Promise(function (resolve, reject) {
        client.mget(key_list, (err, res) => {
            if (err) return reject(err)
            resolve(res)
        })
    });

}

export const redis_set = (obj, client) => {
    const params = unnest(toPairs(obj))
    return new Promise(function (resolve, reject) {
        client.mset(params, (err, res) => {
            if (err) return reject(err)
            resolve(res)
        })
    });
}
export const redis_on = (args, client) => console.log('you ran a on', args)