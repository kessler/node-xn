class Message {
	constructor({ apiName, propertyName, version, args }) {
		if (!apiName) {
			throw new Error('missing api name')
		}

		this._data = { apiName, propertyName, version, args }
	}

	get propertyName() {
		return this._data.propertyName
	}

	get apiName() {
		return this._data.apiName
	}

	get version() {
		return this._data.version
	}

	get args() {
		return this._data.args
	}

	serialize() {
		return {
			apiName: this.apiName,
			propertyName: this.propertyName,
			version: this.version,
			args: [...this.args]
		}
	}

	toJSON() {
		return this.serialize()
	}
}

module.exports = Message