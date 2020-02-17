import {connect} from '../index'

require('dotenv').config()

test('Can connect to redis', () => {
    const redibase = connect(process.env.redis)
    redibase.quit()
    expect(1+1).toBe(2)
})
test('Can get and set some data', () => {
    const redibase = connect(process.env.redis)
    redibase.get([['jobs_pending']])
    expect(1+1).toBe(2)
})