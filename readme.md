## Aim

This package aims to offer an open source alternative to firebase which is powered by redis.
The goal is to harness the speed of vanilla redis while adding much loved firebase like features.
With this package you can subscribe to data changes, store deeply nested data while still owning your stack.

## Usage

Installation:

```
npm i redibase  // Or yarn add redibase
```
Initialise a redis connection

```js
import {connect} from 'redibase'
const redibase = connect('redis://....') // params are sent directly through to promise-redis
export redibase
```
Modify your data

```js
import {redibase} from 'src/config/redibase' // import the instance you created
// give a path and an object to replace at that location
redibase.set(['animals',0], {name: 'cow', age: 2}) // set uses ramda's assocPath under the hood

```

Retrieve your data

```js
import {redibase} from 'src/config/redibase' // import the instance you created
// give a path and an object to replace at that location
redibase.get(['animals']) // [{name: 'cow', age: 2}]

```

Subscribe to data changes

```js
import {redibase} from 'src/config/redibase' // import the instance you created
// give a path and a callback
redibase.on(['animals', 0, 'name'], (old_value, new_value) => console.log(old_value, new_value))
```