import {connect} from '../index'
import {decorate, undecorate} from './pure'
require('dotenv').config()

test('Can get and set some data', async () => {
    const redibase = connect(process.env.redis)
    
    const r1 = await redibase.set('key1', 'yup')
    const r2 = await redibase.get('key1')
    expect(r2).toEqual(['yup'])
    const r3 = await redibase.delete('key1')
    const r4 = await redibase.get('key1')
    expect(r4).toEqual([null])


    redibase.quit()
})

test.todo('Nested data')
test.skip('Nested data', async () => {
    const redibase = connect(process.env.redis)
    const sample_data = {
        people: [{name: 'john', settings: {mode: 1, likes_spam_email: false}}, {name: 'sandy', mood: 'unknown'}],
        animals: [{name: 'cow', age: 2}, {name: 'sheep', age: 8.2, favorite_color: null}]
    }
    const r1 = await redibase.set('', sample_data)
    const r2 = await redibase.get(['sheep', 'favorite_color'])
    expect(r2).toEqual(null)

    const r3 = await redibase.set('animals.1.favorite_color', 'white')
    const r4 = await redibase.get(['sheep', 'favorite_color'])
    expect(r4).toEqual('white')
    
    const change = {name: 'john'}
    const r5 = await redibase.set('people.0', change)
    const r6 = await redibase.get('people.0')
    expect(r6).toEqual(change)
    
    const r7 = await redibase.delete('animals.0')
    const r8 = await redibase.get('animals.0')
    expect(r8).toEqual([{name: 'sheep', age: 8.2, favorite_color: 'white'}])
    redibase.quit()
})

test('can decorate and undecorate', () => {
    expect(undecorate(decorate(1))).toEqual(1)
    expect(undecorate(decorate(['test.0']))).toEqual(['test.0'])
    expect(undecorate(decorate(Infinity))).toEqual(Infinity)
    expect(undecorate(decorate(false))).toEqual(false)
    expect(undecorate(decorate(null))).toEqual(null)
    expect(undecorate(decorate('null'))).toEqual('null')
    expect(undecorate(decorate(undefined))).toEqual(undefined)
})

test.todo('Should handle objects with funny key names')
test.skip('Should handle objects with funny key names', async () => {
    const redibase = connect(process.env.redis)

    const r1 = await redibase.set('key1', {'not.ok': 'mate'})
    const r2 = await redibase.set('key1', {2: 'mate'})
    const r3 = await redibase.set('key1', {'p_p': undefined})
    const r4 = await redibase.set('key1', {'p_p': []})
   
    redibase.quit()
})
