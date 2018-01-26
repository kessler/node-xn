const Message = require('./Message')
const semver = require('semver')
const debug = require('./debug')('Server')
const packageJson = require('../package.json')
const { ApiFunction, ApiModule, ApiConstant, METADATA_API_NAME } = require('./Api')
const { isFunction, isObject } = require('util')

class Server {

	constructor() {
		this._apis = new Map()
		this._defaultVersion = semver.clean(process.version)
		this.addApiModule(METADATA_API_NAME, new ServerApi(this), packageJson.version)
	}

	get defaultVersion() {
		return this._defaultVersion
	}

	dispatch({ apiName, propertyName, version = this._defaultVersion, args = [] }, reply) {
		debug(`dispatch() apiName="${apiName}" propertyName="${propertyName}" version="${version}" args.length=${args.length}`)

		let message = new Message({ apiName, propertyName, version, args })

		if (!isFunction(reply)) {
			throw new Error('missing or invalid reply argument')
		}

		let api
		try {
			api = this.getApi(apiName, version)
		} catch (e) {
			debug(e)
			return reply(e)
		}

		if (api) {
			return api.dispatch(message, reply)
		}

		return reply(new Error('no such api'))
	}

	getApi(name, version = this._defaultVersion) {
		debug(`getApi() name="${name}" version="${version}"`)

		let versions = this._getApiVersions(name)

		if (!versions) {
			throw new Error(`api ${name} does not exist`)
		}

		let bestVersion = this._getBestApiVersion(versions.keys(), version)

		if (!bestVersion) {
			throw new Error(`could not find an api version that satisfies "${version}" for api "${name}"`)
		}

		return versions.get(bestVersion)
	}

	getApiArtifact(name, version) {
		let api = this.getApi(name, version)
		if (api) return api.artifact
	}

	addApiFunction(name, fn, version) {
		this._addApi(ApiFunction, name, fn, version)
	}

	addApiModule(name, mdl, version, filters) {
		this._addApi(ApiModule, name, mdl, version, filters)
	}

	requireApiModule(name, filters) {
		let mdl = require(name)
		let version

		try {
			let packageJson = require(`${name}/package.json`)
			version = packageJson.version
		} catch (e) {
			// assign the node version to anything that doesn't have a package version (such as core modules)
			version = this._defaultVersion
		}

		this.addApiModule(name, mdl, version, filters)
	}

	addApiConstant(name, constant, version) {
		this._addApi(ApiConstant, name, constant, version)
	}

	[Symbol.iterator]() {
		return this._apis.entries()
	}

	_addApi(Impl, name, artifact, version = this._defaultVersion, filters) {
		debug(`_addApi() class="${Impl.name}" name="${name}" version="${version}"`)

		let api = new Impl(name, artifact, version, filters)
		let versions = this._getApiVersions(api.name)

		if (!versions) {
			versions = new Map()
			this._apis.set(name, versions)
		}

		versions.set(version, api)
	}

	_getBestApiVersion(versions, targetVersion) {
		debug('_getBestApiVersion() %o, "%s")', versions, targetVersion)

		let best = '0.0.0'

		for (let version of versions) {
			debug(`testing "${version}" against "${targetVersion}"`)

			// if the current version in the iteration satisfies the demand of target version
			// and if it is >= the best match so far then replace it
			if (semver.satisfies(version, targetVersion) && semver.satisfies(version, `>=${best}`)) {
				debug(`selecting "${version}"" as best match so far`)
				best = version
			}
		}

		// return nothing if we didn't find a good match
		if (best !== '0.0.0') {
			debug(`"${best}"" best satisfies "${targetVersion}"`)
			return best
		}

		debug(`did not find a version that satisfies "${targetVersion}"`)
	}

	_getApiVersions(name) {
		return this._apis.get(name)
	}
}

class ServerApi {
	constructor(server) {
		this._server = server
	}

	getApis(reply) {
		let result = {}

		for (let [name, versions] of this._server) {
			let version = this._findLatestVersion(versions)
			let api = versions.get(version)
			if (!api) {
				throw new Error('expected an api object here, this is a bug')
			}
			result[name] = api.descriptor
		}

		reply(null, result)
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