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
    const i1 = 1
    const i2 = ['test.0']
    const i3 = Infinity
    const i4 = false
    const i5 = null
    const i6 = 'null'
    const i7 = undefined
    const r1 = decorate(i1)
    const r2 = decorate(i2)
    const r3 = decorate(i3)
    const r4 = decorate(i4)
    const r5 = decorate(i5)
    const r6 = decorate(i6)
    const r7 = decorate(i7)
    const o1 = undecorate(r1)
    const o2 = undecorate(r2)
    const o3 = undecorate(r3)
    const o4 = undecorate(r4)
    const o5 = undecorate(r5)
    const o6 = undecorate(r6)
    const o7 = undecorate(r7)
    expect(o1).toEqual(i1)
    expect(o2).toEqual(i2)
    expect(o3).toEqual(i3)
    expect(o4).toEqual(i4)
    expect(o5).toEqual(i5)
    expect(o6).toEqual(i6)
    expect(o7).toEqual(i7)
})

test.todo('Should handle objects with funny key names')
test.skip('Should handle objects with funny key names', async () => {
    const redibase = connect(process.env.redis)

    const r1 = await redibase.set('key1', {'not.ok': 'mate'})
    const r2 = await redibase.set('key1', {2: 'mate'})
    const r3 = await redibase.set('key1', {'p_p': undefined})
   
    redibase.quit()
})
