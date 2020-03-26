import { compose, concat, isNil, keys, map, toPairs, reject,  unnest, reduce, includes } from 'ramda'
import { map_keys, parse, stringify, key_to_path } from './pure'

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
    if (includes(original_command, ['type', 'hgetall', 'del', 'mset', 'hmset', 'hdel', 'eval' ])) {
        return result
    }
    throw new Error('original command type not recognized...' + original_command)
}

export const redis_commands = async (command_list: any[][], client) => {
    const decorated_command_list = reject(isNil, command_list.map(decorate))
    console.time(`running ${decorated_command_list.length} commands in a transaction`)
    const results = await client.multi(decorated_command_list).exec()
    console.timeEnd(`running ${decorated_command_list.length} commands in a transaction`)
    const output = results.map((result, i) => undecorate(result[1], command_list[i][0]))
    return output
}