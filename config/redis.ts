// var redis = require('promise-redis')();
// const client = redis.createClient(process.env.redis);


// client.on("error", function(error) {
//   console.error(error);
// });


// client.hmset('jobs_pending', {name:'create_product', payload: 11234})
//     .then(console.log)
//     .catch(console.log)
// client.hmget('jobs_pending', 'name', 'payload')
//     .then(console.log)
//     .catch(console.log)