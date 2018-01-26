const { isFunction, isNullOrUndefined } = require('util')
const semver = require('semver')

class ApiBase {
	constructor(name, artifact, version) {
		if (new.target === ApiBase) {
			throw new Error('cannot instantiate, this is an abstract class')
		}

		if (!name) {
			throw new Error('missing api name')
		}

		if (!version) {
			throw new Error('missing api version')
		}

		if (!semver.valid(version)) {
			throw new Error(`invalid version "${version}`)
		}

		this._name = name
		this._version = version
		this._artifact = artifact
	}

	get name() {
		return this._name
	}

	get version() {
		return this._version
	}

	get artifact() {
		return this._artifact
	}

	get descriptor() {
		let descriptor = {
			type: this._getTypeForDescriptor(),
			name: this.name,
			version: this.version
		}

		this._enhanceDescriptor(descriptor)
		return descriptor
	}

	dispatch(message, reply) {
		throw new Error('must implement')
	}

	_getTypeForDescriptor() {
		return this.constructor.name
	}

	_enhanceDescriptor(descriptor) {
		// noop by default
	}
}

class ApiFunction extends ApiBase {

	constructor(name, fn, version) {
		super(name, fn, version)
	}

	dispatch(message, reply) {
		let args = message.args
		args.push(reply)
		this.artifact(...args)
	}
}

const DEFAULT_FILTERS = Object.entries({ startsWith: ['_'], regexp: [], equals: ['constructor'] })

class ApiModule extends ApiBase {
	constructor(name, mdl, version, filters = {}) {
		super(name, mdl, version)

		this._assignDefaultFilters(filters)

		let proto = Object.getPrototypeOf(mdl)

		let properties
		if (proto === Object.prototype) {
			properties = Object.keys(mdl)
		} else {
			properties = Object.getOwnPropertyNames(proto)
		}

		this._properties = this._filterProperties(filters, properties)
	}

	dispatch(message, reply) {
		let propertyName = message.propertyName

		if (isNullOrUndefined(propertyName)) {
			return reply(new Error('missing property name'))
		}

		if (propertyName.trim().length === 0) {
			return reply(new Error('empty property name'))
		}

		let fn = this.artifact[propertyName]
		if (isNullOrUndefined(fn)) {
			return reply(new Error('unsupported in this api'))
		}

		if (isFunction(fn)) {
			let args = message.args
			args.push(reply)
			return this.artifact[propertyName](...args)
		}

		reply(this.artifact[propertyName])
	}

	_enhanceDescriptor(descriptor) {
		descriptor.properties = this._properties.concat([])
	}

	_filterProperties(filters, properties) {
		return properties.filter(p => {
			for (let value of filters.equals) {
				if (p === value) return false
			}

			for (let value of filters.startsWith) {
				if (p.startsWith(value)) return false
			}

			for (let value of filters.regexp) {
				throw new Error('must implement')
			}

			return true
		})
	}

	_assignDefaultFilters(filters) {
		for (let [name, defaultFilters] of DEFAULT_FILTERS) {
			if (!filters[name]) {
				filters[name] = [...defaultFilters]
			}
		}
	}
}

class ApiConstant extends ApiBase {
	constructor(name, constant, version) {
		super(name, constant, version)
	}

	dispatch(message, reply) {
		reply(null, this.artifact)
	}
}

class ApiRemote extends ApiBase {
	constructor() {

	}

	dispatch(message, reply) {

	}
}

module.exports.ApiBase = ApiBase
module.exports.ApiFunction = ApiFunction
module.exports.ApiModule = ApiModule
module.exports.ApiConstant = ApiConstant
module.exports.METADATA_API_NAME = '$metadata$'

Object.freeze(module.exports)
