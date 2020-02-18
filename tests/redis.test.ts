import {connect} from '../index'
import {equals} from 'ramda'
import {decorate, undecorate} from 'helpers/pure.ts'
require('dotenv').config()

const payload = {
    animals: [
        {
            name: 'cow',
            age: 2
        }, 
        {
            name: 'sheep',
            noise: 'beh'
        }
    ],
    is_cute: 'true',
    num: '42'
}

test('Can get and set some data', async () => {
    const redibase = connect(process.env.redis)

    const r1 = await redibase.set('key1', 'yup')
    const r2 = await redibase.get('key1')
    expect(equals(r2, ['yup'])).toBe(true)
    const r3 = await redibase.delete('key1')
    const r4 = await redibase.get('key1')
    expect(equals(r4, [null])).toBe(true)

    redibase.quit()
})

test('dev tests', async () => {
    const redibase = connect(process.env.redis)
    await redibase.set(['animals', 0, 'name'], 'sheep')
    redibase.quit()
})