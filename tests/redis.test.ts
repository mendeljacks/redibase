import {connect} from '../index'
import {equals} from 'ramda'
require('dotenv').config()

test('Can get and set some data', async () => {
    const redibase = connect(process.env.redis)
    const response1 = await redibase.set([{path: ['key1'], payload: 'yup'}])
    const response2 = await redibase.set([{path: ['key2'], payload: 'nope'}])
    const response3 = await redibase.get([['key1'], ['key2']])
    redibase.quit()
    expect(equals(response3, [ 'yup', 'nope' ])).toBe(true)
})