export const redis_get = (path_list: any[][], client: any): Promise<any> => {
    console.log('you ran a get', path_list)
    return Promise.resolve('ok')
}
export const redis_set = (args, client) => console.log('you ran a set', args)
export const redis_on = (args, client) => console.log('you ran a on', args)