import * as redis from 'redis'
import { redis_get } from './helpers/redis/redis'

interface redibase_root {
    get: (path_list: any[][]) => Promise<string>
    // set: 
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
        get: (path_list) => redis_get(path_list, client),
        // set,
        // on,
        quit
    }
}
export {connect}