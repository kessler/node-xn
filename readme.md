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
const xn = require('xn')
const axon = require('axon')

// create the rpc server
let server = new xn.RpcServer()           
server.addModule('fs')

// create the axon sockets
let rep = axon.socket('rep')
let req = axon.socket('req')

rep.bind(3000)
req.connect(3000)

rep.on('message', (message, reply) => {
    server.dispatch(message, reply) // integrate xn server with axon
})

// create the rpc client
let client = new xn.RpcClient({
    send: (message, cb) => {
        req.send(message, cb) // integrate xn client with axon
    }
})

// expose the remote calls on a local object
client.refresh((err, rpc) => {
    if (err) return done(err)

    // rpc === client.rpc
    rpc.fs.writeFile(filename, 'test', (err) => {
        console.log(err ? err : 'success' )
    })
})

// it is possible to skip the refresh() stage and send an api call immediately:
client.sendApiMethodCall('fs', '*', 'writeFile', ['test', 'test']
                                        , (err) => { console.log(err ? err : 'success' )})
```
For further examples see [this test](/test/integration.test.js)

## api (TBD)
For now, you can take a look at the documentation in the code.

[//]: # (start marker for auto doc)

[//]: # (end marker for auto doc)

## license

[MIT](http://opensource.org/licenses/MIT) © yaniv kessler
