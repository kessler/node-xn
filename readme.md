# xn

**a distilled engine for creating RPCs**

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

let server = new xn.Server()
let serverSocket = axon.socket('rep')

serverSocket.bind(3000)

serverSocket.on('message', (message, reply) => {
    server.dispatch(message, reply)
})

server.addModule('fs')
```

## api

### `main(arg[,opts])`

## license

[MIT](http://opensource.org/licenses/MIT) © yaniv kessler
