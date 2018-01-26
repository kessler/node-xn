'use strict'

const packageJson = require('../package.json')
const debug = require('./debug')('Client')
const { isFunction } = require('util')
const Message = require('./Message')
const { METADATA_API_NAME } = require('./Api')
const _rpc = Symbol('_rpc')
const _adapter = Symbol('_adapter')

class Client {

	/**
	 *	Create a new client. A client requires an adapter to the underlying
	 *	transport mechanism. e.g:
	 *
	 *	```javascript
	 *	let client = new Client({
	 *		send: (message, reply) => {
	 *			myTransport.send(message, reply)
	 *		}
	 *	})
	 *	```
	 *	see integration test for more concrete examples
	 *
	 *	@param {Object} adapter - an object exposing a send method: 
	 *								{ send: (message, reply) {}}
	 *
	 */
	constructor(adapter) {
		this[_adapter] = adapter
		this[_rpc] = undefined
	}

	sendMessage({ apiName, version = '*', propertyName, args = [] }, reply) {
		debug(`sendMessage() apiName="${apiName}" version="${version}" propertyName="${propertyName}" args="%o"`, args)
		let message = new Message({ apiName, version, propertyName, args })
		this[_adapter].send(message.serialize(), reply)
	}

	get rpc() {
		return this[_rpc]
	}

	refresh(callback) {
		debug('refresh()')

		let message = {
			apiName: METADATA_API_NAME,
			propertyName: 'getApis'
		}

		this.sendMessage(message, (err, apis) => {
			debug('refresh() callback')

			if (err) {
				debug(err)
				return callback(err)
			}

			let rpc = this[_rpc] = new RPC(this, apis || {})

			callback(null, rpc)
		})
	}

	/**
	 *	A static method that combines contruction and refreshing of 
	 *	the client instance
	 *
	 *	@param {Object} adapter - see constructor
	 *	@param {Function} callback
	 */
	static create(adapter, callback) {
		let client = new Client(adapter)
		client.refresh(callback)
	}
}

const _add = Symbol('_add')
const _call = Symbol('_call')
const _client = Symbol('_client')

class RPC {
	constructor(client, apis) {
		this[_client] = client

		let entries = Object.entries(apis)

		for (let [name, api] of entries) {
			this[_add](name, api)
		}
	}

	[_call](apiName, propertyName, ...args) {
		debug(`RPC._call() apiName="${apiName}", propertyName="${propertyName}"`)

		let reply = args.pop()

		if (!isFunction(reply)) {
			throw new Error(`missing callback parameter for apiName="${apiName}" propertyName="${propertyName}"`)
		}

		this[_client].sendMessage({ apiName, propertyName, args }, reply)
	}

	[_add](name, api) {
		debug('RPC._add() name="%s" api="%o"', name, api)
		if (name === METADATA_API_NAME) return

		if (api.type === 'ApiModule') {
			let apiModule = this[name] = {}
			for (let p of api.properties) {
				apiModule[p] = (...args) => this[_call](name, p, ...args)
			}

			return
		}

		this[name] = (...args) => this[_call](name, undefined, ...args)
	}
}

module.exports = Client