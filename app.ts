import * as redis from 'redis'
import { redis_get, redis_set } from './helpers/redis/redis'
import { path_to_key } from './helpers/pure/path_to_key'

interface redibase_root {
    get: (path_list: any[]) => Promise<any>
    set: (set_items: {path: any[], payload: any}[]) => Promise<any>
    quit: () => {}

}

const connect = (args): redibase_root => {
    console.log('connecting to', args)
    const client = redis.createClient(args)
    // client.on("error", function(error) {
    //     console.error(error);
    //   });
    const quit = () => client.quit()
    return {
        get: (path) => redis_get([path_to_key(path)], client),
        set: (set_items) => redis_set(set_items, client),
        // on,
        quit
    }
}
export {connect}