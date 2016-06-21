'use strict'

const packageJson = require('../package.json')
const debug = require('./debug')('Client')

class Client {

	constructor(adapter) {
		this._adapter = adapter
		this.rpc = {} //TODO maybe this should be a Map?
	}

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

	sendApiMethodCall(apiName, version, methodName, args, callback) {
		this._adapter.send({
			apiName,
			version,
			methodName,
			args
		}, callback)
	}

	sendApiCall(apiName, version, callback) {
		this._adapter.send({
			apiName,
			version
		}, callback)
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

	static create(adapter, callback) {
		let client = new Client(adapter)
		client.refresh(callback)
	}
}

module.exports = Client
