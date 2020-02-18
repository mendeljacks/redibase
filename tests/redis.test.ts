import {connect} from '../index'
import {equals} from 'ramda'
require('dotenv').config()

test('Can get and set some data', async () => {
    const redibase = connect(process.env.redis)
    
    const response1 = await redibase.set('key1', 'yup')
    const response3 = await redibase.get('key1')

    redibase.quit()
    expect(equals(response3, ['yup'])).toBe(true)
})