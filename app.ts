import * as redis from 'redis'


interface redibase_root {
    get: (path_list: any[][], client: any) => Promise<string>
    quit: () => {}
    // set: Function

}

const get = (path_list, client) => {
    console.log('you ran a get', path_list)
    return Promise.resolve('ok')
}
const set = (args, client) => console.log('you ran a set', args)
const on = (args, client) => console.log('you ran a on', args)


const connect = (args): redibase_root => {
    console.log('connecting to', args)
    const client = redis.createClient(args)
    // client.on("error", function(error) {
    //     console.error(error);
    //   });
    const quit = () => client.quit()
    return {
        get,
        set,
        on,
        quit
    }
}
export {connect}