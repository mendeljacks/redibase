import { connect } from '../index'
import { parse, stringify } from './pure'
const blns = require('blns')
require('dotenv').config()

const redibase = connect(process.env.redis)

beforeAll(async () => {
    await redibase.delete('')
})

afterAll(async () => {
    redibase.quit()
})

test('Indices are properly merged', async () => {
    const sample_data = {
        people: [{ name: 'john', settings: { mode: 1, likes_spam_email: false } }, { name: 'sandy', mood: 'unknown' }],
        animals: [{ name: 'cow', age: 2 }, { name: 'sheep', age: 8.2, favorite_color: null }, {name: 'donkey', age: 1}]
    }
    const sample_addition = { name: 'chicken', age: 3.14 }

    const r1 = await redibase.set('', sample_data)
    const r2 = await redibase.set('animals.3', sample_addition)
    const r3 = await redibase.get('')
    expect(r3.animals[3]).toEqual(sample_addition)
})

test.skip('Can store and retrieve json', async () => {
    const sample_data = {
        people: [{ name: 'john', settings: { mode: 1, likes_spam_email: false } }, { name: 'sandy', mood: 'unknown' }],
        animals: [{ name: 'cow', age: 2 }, { name: 'sheep', age: 8.2, favorite_color: null }, {name: 'donkey', age: 1}]
    }
    const r1 = await redibase.set('', sample_data)
    const r2 = await redibase.get('people.0.name')
    expect(r2).toEqual('john')
    const r25 = await redibase.get('')
    expect(r25).toEqual(sample_data)

    const r3 = await redibase.set('animals.1.favorite_color', 'white')
    const r4 = await redibase.get('animals.1.favorite_color')
    expect(r4).toEqual('white')

    const change = { name: 'john' }
    const r5 = await redibase.set('people.0', change)
    const r6 = await redibase.get('people.0')
    expect(r6).toEqual(change)

    const r7 = await redibase.delete('animals.0')
    const r8 = await redibase.get('animals.0')
    expect(r8).toEqual([{ name: 'sheep', age: 8.2, favorite_color: 'white' }])
})

test.skip('Can store naughty strings and different types as values', async () => {
    const store_and_retrieve = async (path, value) => {
        const r1 = await redibase.set(path, value)
        const r2 = await redibase.get(path)
        expect(r2).toEqual(value)
    }
    const values_to_try = [
        true, false,
        null, undefined,
        1, -1, 0, 1.11, -0, Infinity, -Infinity, NaN,
        [], {}, 'throw new Error("oops")',
        '/', '.', '-', '=', '_',
        'object', 'function', 'string', ...blns

    ]

    for (let i = 0; i < values_to_try.length; i++) {
        await store_and_retrieve('key1', values_to_try[i])
    }


})
test.skip('if no key return undefined', async () => {
    const delete_response = await redibase.delete('key1')
    const get_response = await redibase.get('key1')
    expect(get_response).toEqual(undefined)

})
test.todo('should dissallow functions and regex as payload values')
test.todo('should dissallow payload keys that are invalid or contain .,/numbers etc...')


test('can stringify and parse', () => {
    expect(parse(stringify(1))).toEqual(1)
    expect(parse(stringify(['test.0']))).toEqual(['test.0'])
    expect(parse(stringify([1, 2, 'test.0']))).toEqual([1, 2, 'test.0'])
    expect(parse(stringify(Infinity))).toEqual(Infinity)
    expect(parse(stringify(false))).toEqual(false)
    expect(parse(stringify(null))).toEqual(null)
    expect(parse(stringify('null'))).toEqual('null')
    expect(parse(stringify(undefined))).toEqual(undefined)
})

test.skip('Should handle objects with funny key names', async () => {

    const r1 = await redibase.set('key1', { 'not.ok': 'mate' })
    const r2 = await redibase.set('key1', { 2: 'mate' })
    const r3 = await redibase.set('key1', { 'p_p': undefined })
    const r4 = await redibase.set('key1', { 'p_p': [] })

})
