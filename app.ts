import * as redis from 'redis'
import { redis_get, redis_set, redis_delete } from './helpers/redis/redis'
import { path_to_key } from './helpers/pure'

interface redibase_root {
    get: (path: string | any[]) => Promise<any>
    set: (path: string | any[], payload: any) => Promise<any>
    delete: (path: string | any[]) => Promise<any>
    quit: () => {}
    //on
}

const connect = (args): redibase_root => {
    console.log('connecting to', args)
    const client = redis.createClient(args)
    return {
        get: (path) => redis_get([path_to_key(path)], client),
        set: (path, payload) => redis_set({ [path_to_key(path)]: payload }, client),
        delete: (key) => redis_delete([String(key)], client),
        quit: () => client.quit()
    }
}
export { connect }