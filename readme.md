## Redibase

This package is the redis based alternative to google's firebase.
The goal is to harness the speed of vanilla redis while adding much loved firebase features.
With this package you can subscribe to data changes, store deeply nested data without stringifying and you can own your stack.


## Usage

Installation:

```
npm i redibase  // Or yarn add redibase
```
Initialise a redis connection. Parameters are passed directly to the redis constructor

```js
import {connect} from 'redibase'
const redibase = connect('redis://....')
export redibase
```
Modify your data

```js
redibase.set('people', [{name: 'john', age: 29},{name: 'sandy', age: 26}])) 
redibase.set(['animals',0,'age'], 30)

const set_sandys_age = redibase.set('people.1.age')
set_sandys_age(27) 
set_sandys_age(28) 
```

Retrieve your data

```js
redibase.get('animals.0') // [{name: 'cow', age: 2}]
redibase.get(['animals',0]) // or with array notation

```
Delete data

```js
redibase.delete('animals') 
```

Subscribe to data changes

```js
redibase.on(['animals', 0, 'name'], (new_value) => console.log(new_value))
```

Close the connection

```js
redibase.quit()
```


