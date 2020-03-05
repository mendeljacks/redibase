## Redibase

This package is the redis based alternative to google's firebase.
The goal is to harness the speed of vanilla redis while adding much loved firebase features.
With this package you can subscribe to data changes, store deeply nested data without stringifying and you can own your stack.


## Installation
```
npm i redibase  // Or yarn add redibase
```

## Initialise a redis connection
Parameters are passed directly to the redis constructor
```js
import { connect } from 'redibase'
const redibase = connect('redis://....')
export redibase
```
## Modify data
Paths can be given as arrays or strings with dots
```js
redibase.set('people', [{name: 'john', age: 29}, {name: 'sandy', age: 26}])) 
redibase.set(['people', 0, 'age'], 30)
redibase.set('people.0.age', 31)
```
You can hold references to portions of the json
```js
const set_sandys_age = redibase.set('people.1.age')
set_sandys_age(27) 
set_sandys_age(28) 
```
## Retrieve data
```js
redibase.get('people.0')
redibase.get(['people', 0])
```
## Delete data
```js
redibase.delete('people')
redibase.get('people') // null
```

## Subscribe to data
```js
redibase.on(['people', 0, 'name'], (new_value, old_value) => console.log(old_val, new_val))
```

## Close redis connection
```js
redibase.quit()
```


