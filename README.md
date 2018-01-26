# xn

**a distilled engine for creating RPC Servers/Clients**

- Expose any kind of async api, including whole modules, remotely
- Use any kind of transport layer that supports request/response semantics
- Expose different versions of the same api using semver

[![npm status](http://img.shields.io/npm/v/xn.svg?style=flat-square)](https://www.npmjs.org/package/xn) 

## example

### expose core filesystem module using axon
```
npm init
npm i --save xn axon
```

```js
const xn = require('./index')
const axon = require('axon')

// create the rpc server
let server = new xn.RpcServer()
server.requireApiModule('fs')
server.addApiFunction('moo', (a, reply) => {
    reply(null, a + 'b')
})

let myApi = {
    ping: reply => reply(null, 'pong'),
    echo: (what, reply) => reply(null, what)
}
server.addApiModule('meow', myApi)

// create the axon sockets
let rep = axon.socket('rep')
let req = axon.socket('req')

rep.bind(3000)
req.connect(3000)

rep.on('message', (message, reply) => {
    // integrate xn server with axon
    server.dispatch(message, reply)
})

// create the rpc client
let client = new xn.RpcClient({
    send: (message, cb) => {
        // integrate xn client with axon
        req.send(message, cb)
    }
})

// expose the remote calls on a local object
client.refresh((err, rpc) => {
    if (err) return done(err)

    // rpc === client.rpc
    rpc.fs.writeFile('myfile', 'test', (err) => {
        console.log(err ? err : 'success')
    })
})

// it is possible to skip the refresh() stage and send an api call immediately:
let message = {
    apiName: 'fs',
    propertyName: 'writeFile',
    args: ['myfile', 'test']
}

client.sendMessage(message, (err) => {
    console.log(err ? err : 'success')
})
```
For further examples see [this test](/test/integration.test.js)

## api 
## license

[MIT](http://opensource.org/licenses/MIT) © yaniv kessler
