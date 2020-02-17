const redis = require("redis");
const client = redis.createClient();
 
client.on("error", function(error) {
  console.error(error);
});
 
client.set("key", "value", redis.print);
client.get("key", redis.print);
const connect = (args) => {
    console.log('connecting to', args)
    const client = redis.createClient(args)
    const get = (args) => console.log('you ran a get', args)
    const set = (args) => console.log('you ran a set', args)
    const on = (args) => console.log('you ran a on', args)
    return {
        get,
        set,
        on
    }
}
export {connect}