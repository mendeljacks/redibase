import {connect} from '../index'
import {equals} from 'ramda'
require('dotenv').config()

test('Can connect to redis', () => {
    const redibase = connect(process.env.redis)
    redibase.quit()
    expect(1+1).toBe(2)
})
test('Can get and set some data', async () => {
    const redibase = connect(process.env.redis)
    const response1 = await redibase.set([], {key1:'yup'})
    const response2 = await redibase.set([], {key2:'nope'})
    const response3 = await redibase.get(['key1'])
    redibase.quit()
    expect(equals(response3, [ 'yup' ])).toBe(true)
})