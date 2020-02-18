## Redibase

This package is the redis based alternative to google's firebase.
The goal is to harness the speed of vanilla redis while adding much loved firebase like features.
With this package you can subscribe to data changes, store deeply nested data without stringifying and you can own your stack.


## Usage

Installation:

```
npm i redibase  // Or yarn add redibase
```
Initialise a redis connection

```js
import {connect} from 'redibase'
const redibase = connect('redis://....') // params are sent directly through to redis constructor
export redibase
```
Modify your data

```js
import {redibase} from 'src/config/redibase' // import the instance you created
// give a path and an object to replace at that location
redibase.set([
    {
        path: ['animals',0], 
        payload: {name: 'cow', age: 2}
    },
    {
        path: ['people'],
        payload: [{name: 'john'},{name: 'sandy'}]
    } ]) // set uses ramda's assocPath under the hood

```

Retrieve your data

```js
import {redibase} from 'src/config/redibase' // import the instance you created
// give a path and an object to replace at that location
redibase.get([['animals'], ['people', 0]]) // [{name: 'cow', age: 2}]
redibase.get(['animals.0', 'people']) // or with dot notation

```

Subscribe to data changes

```js
import {redibase} from 'src/config/redibase' // import the instance you created
// give a path and a callback
redibase.on(['animals', 0, 'name'], (old_value, new_value) => console.log(old_value, new_value))
```

Close the connection

```js
import {redibase} from 'src/config/redibase' // import the instance you created
redibase.quit()
```


