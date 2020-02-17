import {connect} from '../index'
require('dotenv').config()

test('test', () => {
    const redibase = connect(process.env.redis)
    redibase.quit()
    expect(1+1).toBe(2)
})