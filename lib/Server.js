'use strict'

const semver = require('semver')
const debug = require('./debug')('Server')
const packageJson = require('../package.json')

class Server {

	/**
	 *	
	 *
	 */

	constructor() {
		this._apis = new Map()
		this._defaultVersion = semver.clean(process.version)
		this.addApi('__metadata__', packageJson.version, new ServerApi(this))
	}

	/**
	 *	dispatch a message to apis in this server. e.g
	 *	
	 *	```javascript
	 *	server.dispatch({
	 *		apiName: 'fs',
	 *		methodName: 'writeFile',
	 *		version: '*',
	 *		args: []
	 *	}, (err) => {})
	 *	```
	 *	@param {Object} message - contains all the information needed to invoke the right api
	 *	@param {String} message.apiName - this is required
	 * 	@param {String} message.methodName - optional, if this api has methods
	 *	@param {String} message.version - an optional valid semantic versioning (semver) expression
	 *	@param {Array} message.args  - an array containing 0 or more arguments that will be 
	 *									used when calling the method remotely
	 *
	 */

	dispatch(message, reply) {
		debug('dispatch(%o, %o)', message, reply)

		if (!message) {
			throw new Error('missing message argument')
		}

		if (typeof(reply) !== 'function') {
			throw new Error('missing or invalid reply argument')
		}

		let api = this._getApiWithMessage(message)
		
		if (api instanceof Error) {
			debug('error %o while dispatching to api %o', api, message)
			// api is now an error
			return reply(api)
		}

		debug('found api %o for %o', api, message)

		let args = message.args || []
		debug(`typeof(api) === '${typeof api}`)

		if (typeof (api) === 'object') {
			let methodName = message.methodName
			debug(`methodName: ${methodName}`)

			if (typeof (methodName) === 'string') {
				let method = api[methodName]
		
				if (!method) {
					return reply(new Error(`invalid or missing method name ${methodName}`))
				}

				return this._invokeFunctionWithCallback(api, method, args, reply)
			} else {
				return reply(null, api)
			}

		}

		if (typeof (api) === 'function') {
			let methodName = message.methodName
		
			if (typeof (methodName) !== 'string') {
				return reply('invalid or missing method name ${methodName}')
			}

			return this._invokeFunctionWithCallback(null, api, args, reply)
		}

		// everything else just reply with what's in there
		reply(null, api)
	}

	/**
	 *	Expose an api to clients. e.g
	 *
	 *	```javascript
	 *	server.addApi('foo', '0.0.1', ...api value...)
	 *	```
	 *	
	 *	@param {String} name - the name of the api that's being added, this has to be unique
	 *							in the scope of a server instance.
	 *	@param {String} version - a valid semantic version value (semver)
	 *	@param {Variant} api - an api value can be one of the following: function, number, string, boolean 
	 *							or object. An object can have method, which will be exposed as well
	 */

	addApi(name, version, api) {
		debug(`addApi('${name}', '${version}', %o)`, api)

		if (typeof (name) !== 'string') {
			throw new Error('api name must be a string')
		}

		let cleanVersion = semver.clean(version)

		if (!version) {
			throw new Error(`invalid version ${version}`)
		}

		let versions = this._getApiVersions(name)

		if (!versions) {
			versions = new Map()
			this._apis.set(name, versions)
		}

		versions.set(cleanVersion, api)
		debug(`added api ${name}@${cleanVersion}`)
	}

	/**
	 *	A convenience method to expose a whole module, e.g:
	 *
	 *	```javascript
	 *	server.addModule('my-module') // expose the core filesystem module	
	 *	```
	 *	Modules added through this method have their version set
	 *	to the version specified in their package.json.
	 *
	 *	In the case of core modules or modules that don't have a package.json file
	 * 	the version is set to server.defaultVersion()
	 *
	 *	Using this method is the same as doing:
	 *
	 *	```javascript
	 *	server.addApi('my-module', require('my-module/package.json').version, require('my-module'))
	 *	```
	 *	
	 *	@param {String} name - name of a module that will be require()d
	 */

	addModule(name) {
		let module = require(name)
		let version

		try {
			let packageJson = require(name + '/package.json')
			version = packageJson.version
		} catch (e) {
			// assign the node version to anything that doesn't have a package version (such as core modules)
			version = this._defaultVersion
		}

		this.addApi(name, version, module)
	}


	/**
	 *	Attempt to get an api object from this server's repository
	 *
	 *	@param {String} name - the name of the api you're trying to get
	 *	@param {String} version - a valid and exact semantic version (not an expression)
	 *
	 *	@return {Variant} this can be the api or undefined if it doesn't exist or does not have
	 *						an instance matching the requested version
	 */

	getApi(name, version) {
		debug(`getApi('${name}', '${version}')`)
		let versions = this._getApiVersions(name)
		return versions.get(version)
	}
	
	/**
	 *	Get the default version used for modules and/or apis
	 *	added to this server without a version of their own.
	 *
	 *	unless overridden somehow this will be the version
	 * 	of node running this code
	 *
	 *	@return {String} a semantic version
	 */
	 
	defaultVersion() {
		return this._defaultVersion
	}

	_getApiWithMessage(message) {
		// *** intentionally return errors instead of throwing them ***

		let apiName = message.apiName

		// verify api name
		if (apiName === undefined || apiName === null) {
			return new Error(`missing api name ${apiName}`)
		}

		if (typeof (apiName) !== 'string') {
			return new Error(`invalid api name ${apiName}`)
		}

		if (!this._apis.has(apiName)) {
			return new Error(`remote does not expose ${apiName} api`)
		}

		// default version is the node version
		let version = this._defaultVersion

		// verify version, if it was specified
		if (typeof (message.version) === 'string') {
			version = message.version
		}

		let versions = this._getApiVersions(apiName)

		let bestVersion = this._getBestVersion(versions.keys(), version)

		if (!bestVersion) {
			return new Error(`could not find an api version that satisfies ${version} for api ${apiName}`)
		}

		return this.getApi(apiName, bestVersion)
	}

	// TODO need to make sure this covers all edge cases and such
	_getBestVersion(versions, targetVersion) {
		debug(`_getBestVersion(%o, '${targetVersion}')`, versions)

		let best = '0.0.0'

		for (let version of versions) {
			debug(`testing ${version} against ${targetVersion}`)

			// if the current version in the iteration satisfies the demand of target version
			// and if it is >= the best match so far then replace it
			if (semver.satisfies(version, targetVersion) && semver.satisfies(version, '>=' + best)) {
				debug(`selecting ${version} as best match so far`)
				best = version
			}
		}

		// return nothing if we didn't find a good match
		if (best !== '0.0.0') {
			debug(`${best} best satisfies ${targetVersion}`)
			return best
		}

		debug(`did not find a version that satisfies ${targetVersion}`)
	}

	_getApiVersions(name) {
		return this._apis.get(name)
	}

	_invokeFunctionWithCallback(context, fn, args, reply) {
		debug(`_invokeFunctionWithCallback(${context}, ${fn}, [${args}], ${reply})`)
		fn.apply(context, args.concat([reply]))
	}
}

class ServerApi {
	constructor(server) {
		this._server = server
	}

	getApis(callback) {
		debug('getApis()')

		let apis = this._server._apis
		let result = {}

		for (let api of apis) {
			if (api[0] === '__metadata__') continue
			let version = this._findLatestVersion(api[1])

			result[api[0]] = Object.keys(api[1].get(version))
		}
		
		callback(null, result)
	}

	_findLatestVersion(versions) {
		let latest = '0.0.0'

		for (let version of versions) {
			if (semver.satisfies(version[0], '>' + latest)) {
				latest = version[0]
			}
		}

		return latest
	}
}

module.exports = Server