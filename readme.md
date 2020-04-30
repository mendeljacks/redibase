## Redibase

This package is the redis based alternative to google's firebase.
The goal is to harness the speed of vanilla redis while adding much loved firebase features.
With this package you can subscribe to data changes, store deeply nested data without stringifying and still own your stack.


## Installation
```
npm i redibase  // Or yarn add redibase
```

## Initialise a redis connection
Parameters are passed directly to the redis constructor. An second parameter can be added for options eg connect(connection_string, {verbose: true}) 
```js
import { connect } from 'redibase'
const redibase = connect('redis://....')
export redibase
```
## Modify data

```js
// You can store any valid json objects or values 
await redibase.set('my_key_name', my_obj) // { my_key_name: {...}}

// You can modify nested values by providing a path
await redibase.set(['my', 'key', 'path'], 30) // {my: {key: {path: 30}}}

// String with dots can also represent a path
await redibase.set('my.key.path', 31) // {my: {key: {path: 30}}} (same as above)
```

```js
// You can hold references
const set_sandys_age = redibase.set('people.1.age')
await set_sandys_age(27) 
await set_sandys_age(28) 
```
## Retrieve data
```js
// You can use a path array or path strings
const val = await redibase.get('my.nested.key')
const val = await redibase.get(['my', 'nested','key'])
```
## Delete data
```js
await redibase.delete('people')
await redibase.get('people') // null
```

## Subscribe to data
```js
const subscription_id = redibase.on(['people', 0, 'name'], (new_val, old_val) => console.log(new_val, old_val))
redibase.off(subscription_id)
```

## Close redis connection
```js
redibase.quit()
```

## Unsupported features
You can always access the redis directly
```js
await redibase.client.mget(my_args)
```
## Limitations 
The maximum number of nesting layers is limited by the javascript recursion depth, which is around 10000. By comparison, firebase allows 32 layers of nesting.

The maintainers are always happy to add custom features if you ask with examples.