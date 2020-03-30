import { compose, concat, includes, isNil, map, reject } from 'ramda'
import { map_keys, parse, stringify } from './pure'
const shortid = require('shortid')
const decorate = (command: any[]) => {
    if (command.length < 2) return
    if (includes(command[0], ['mget', 'del', 'hgetall', 'hmget'])) {
        return command.map((arg, i) => {
            if (i === 0) return arg
            return concat('redibase_')(arg)
        })
    }
    if (command[0] === 'mset') {
        return command.map((arg, i) => {
            if (i === 0) return arg
            return compose(map_keys(concat('redibase_')), map(stringify))(arg)
        })
    }
    if (command[0] === 'eval') {
        return command
    }
    if (includes(command[0], ['hmset', 'hdel', 'type'])) {
        return command.map((arg, i) => {
            if (i === 1) return concat('redibase_')(arg)
            return arg
        })
    }
    throw new Error('command type not recognized...')
}

const undecorate = (result, original_command) => {
    if (original_command === 'mget') {
        return result.map(el => isNil(el) ? el : parse(el))
    }
    if (includes(original_command, ['type', 'hgetall', 'del', 'mset', 'hmset', 'hdel'])) {
        return result
    }
    if (original_command === 'eval') {
        return result
    }
    throw new Error('original command type not recognized...' + original_command)
}
export const evalsha = async (name, keys, client) => {
    const random = shortid.generate()
    if (client.__redibase_options__.verbose) { console.time(`${random} running ${name} ${JSON.stringify(keys)} commands in a transaction`) }
    const results = await new Promise((resolve, reject) => {
        client.__shavaluator__.exec(name, keys, [], function (err, result) {
            if (err) return reject(err)
            return resolve(result)
        })
    })
    if (client.__redibase_options__.verbose) { console.timeEnd(`${random} running ${name} ${JSON.stringify(keys)} commands in a transaction`) }
    return results
}
export const redis_commands = async (command_list: any[][], client) => {
    const decorated_command_list = reject(isNil, command_list.map(decorate))
    const random = shortid.generate()
    if (client.__redibase_options__.verbose) { console.time(`${random} running ${JSON.stringify(decorated_command_list)} commands in a transaction`) }
    const results = await client.multi(decorated_command_list).exec()
    if (client.__redibase_options__.verbose) { console.timeEnd(`${random} running ${JSON.stringify(decorated_command_list)} commands in a transaction`) }
    const output = results.map((result, i) => undecorate(result[1], command_list[i][0]))
    return output
}