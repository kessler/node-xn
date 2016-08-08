'use strict'

const packageJson = require('../package.json')
const debug = require('./debug')('Client')

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
		this._adapter = adapter
		this.rpc = {} //TODO maybe this should be a Map?
	}

	/**
	 *	Send an api method call, with arguments
	 *
	 *	```javascript
	 *	client.sendApiMethodCall('fs', '*', 'writeFile', ['test', 'test'], (err) => {})
	 *	```
	 *
	 *	@param {String} apiName - name of the remote API, e.g "fs"
	 *	@param {String} version - a valid semantic versioning (semver) expression
	 *	@param {String} methodName - the name of the remote method, e.g. fs.writeFile
	 *	@param {Array} args - an array containing 0 or more arguments that will be 
	 *							used when calling the method remotely
	 *	@param {Function} callback
	 */
	sendApiMethodCall(apiName, version, methodName, args, callback) {
		debug('sendApiMethodCall() %s@%s.%s', apiName, version, methodName)
		this._adapter.send({
			apiName,
			version,
			methodName,
			args
		}, callback)
	}

	/**
	 *	Send an api method call, with arguments
	 *
	 *	```javascript
	 *	client.sendApiMethodCall('fs', '*', (err) => {})
	 *	```
	 *
	 *	@param {String} apiName - name of the remote API, e.g "fs"
	 *	@param {String} version - a valid semantic versioning (semver) expression
	 *	@param {Function} callback
	 */
	sendApiCall(apiName, version, callback) {
		debug('sendApiCall() %s@%s', apiName, version)
		this._adapter.send({
			apiName,
			version
		}, callback)
	}

	/**
	 *	Instead of making calls using sendApi* methods, one can call refresh() which will 
	 *	populate all available remotely apis under client.rpc, e.g
	 *
	 *	```javascript
	 *	client.refresh((err, rpc) => {
	 *		// client.rpc === rpc
	 *		client.rpc.fs.writeFile('test', 'test', (err) => {})
	 *	})
	 *	```
	 *
	 *	@param {Function} callback
	 */
	refresh(callback) {
		debug('refresh()')

		this.sendApiMethodCall('__metadata__', packageJson.version, 'getApis', [],
			(err, apis) => {
				if (err) return callback(err)

				let apiNames = Object.keys(apis)
				debug('apiNames: %o', apiNames)

				for (let i = apiNames.length - 1; i >= 0; i--) {
					let apiName = apiNames[i]
					let methods = apis[apiName]

					if (methods.length === 0) {
						debug(`api '${apiName}' has no methods`)
						this._addMethodlessApi(apiName)

					} else {
						debug(`api '${apiName}' has ${methods.length} methods`)
						this.rpc[apiName] = {}
						for (let x = methods.length - 1; x >= 0; x--) {
							this._addApi(apiName, methods[x])
						}
					}
				}

				callback(null, this.rpc)
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

	// TODO this is not an efficient memory usage
	_addMethodlessApi(apiName, version) {
		this.rpc[apiName] = (cb) => {
			if (typeof cb !== 'function') throw new Error('missing callback argument')
			this.sendApiCall(apiName, version || '*', cb)
		}
	}

	// TODO this is not an efficient memory usage
	_addApi(apiName, methodName, version) {
		let self = this
		this.rpc[apiName][methodName] = function() {
			let cb = arguments[arguments.length - 1]

			if (typeof cb !== 'function') throw new Error('missing callback argument')

			let args = []

			for (let i = 0; i < arguments.length - 1; i++) {
				args.push(arguments[i])
			}

			self.sendApiMethodCall(apiName, version || '*', methodName, args, cb)
		}
	}
}

module.exports = Client
