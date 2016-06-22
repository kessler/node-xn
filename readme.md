# xn

**a distilled engine for creating RPC Servers/Clients**

- Quickly expose any kind of async api, including whole modules
- Use any kind of transport layer that supports request/response semantics
- Expose different versions of the same api using semver

[![npm status](http://img.shields.io/npm/v/xn.svg?style=flat-square)](https://www.npmjs.org/package/xn) 

## example

`npm i xn`

### expose core filesystem module using axon
```
npm init
npm i --save axon
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
    server.dispatch(message, reply)
})

// create the rpc client
let client = new xn.RpcClient({
    send: (message, cb) => {
        server.dispatch(message, (err, result) => {
            req.send(message, cb)
        })
    }
})

client.refresh((err) => {
    if (err) return done(err)

    client.rpc.fs.writeFile(filename, 'test', (err) => {
        if (err) return done(err)

        expect(fs.readFileSync(filename, 'utf8')).to.equal('test')
        done()
    })
})
```
For further examples see [this test](/test/integration.test.js)

## api

[//]: # (start marker for auto doc)

[//]: # (end marker for auto doc)

## license

[MIT](http://opensource.org/licenses/MIT) © yaniv kessler
