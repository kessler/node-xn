const expect = require('chai').expect
const Server = require('../lib/Server')

describe('Server', () => {
	let server, socket
	let name = 'test'
	let version = '0.0.1'

	describe('can expose', () => {
		it('objects as api', () => {
			let api = {}

			server.addApiModule(name, api, version)
			expect(server.getApiArtifact(name, version)).to.equal(api)
		})

		it('objects with functions as api', () => {
			let api = { x: () => {} }

			server.addApiModule(name, api, version)
			let actualApi = server.getApiArtifact(name, version)
			expect(actualApi).to.equal(api)
			expect(actualApi.x).to.be.instanceOf(Function)
		})

		it('instances of a class', () => {
			class T { f() {} }
			let api = new T()
			server.addApiModule(name, api, version)
			let actualApi = server.getApiArtifact(name, version)
			expect(actualApi).to.equal(api)
			expect(actualApi.f).to.be.instanceOf(Function)
		})

		it('functions as api', () => {
			let api = () => {}

			server.addApiFunction(name, api, version)
			expect(server.getApiArtifact(name, version)).to.equal(api)
		})

		it('strings as api', () => {
			let api = 'foo'

			server.addApiConstant(name, api, version)
			expect(server.getApiArtifact(name, version)).to.equal(api)
		})

		it('numbers as api', () => {
			let api = 42

			server.addApiConstant(name, api, version)
			expect(server.getApiArtifact(name, version)).to.equal(api)
		})

		it('boolean as api', () => {
			let api = false

			server.addApiConstant(name, api, version)
			expect(server.getApiArtifact(name, version)).to.equal(api)
		})

		it('whole modules as api', () => {
			let api = require('http')

			server.requireApiModule('http')
			expect(server.getApiArtifact('http')).to.equal(api)
		})
	})

	describe('can dispatch messages to', () => {
		it('object apis', (done) => {
			let api = { x: (callback) => { callback(null, 'foo') } }

			let message = {
				apiName: name,
				version: version,
				propertyName: 'x'
			}

			server.addApiModule(name, api, version)
			server.dispatch(message, (err, result) => {
				if (err) return done(err)
				expect(result).to.equal('foo')
				done()
			})
		})

		it('function apis', (done) => {
			let api = (callback) => { callback(null, 'foo') }

			let message = {
				apiName: name,
				version: version
			}

			server.addApiFunction(name, api, version)
			server.dispatch(message, (err, result) => {
				if (err) return done(err)
				expect(result).to.equal('foo')
				done()
			})
		})

		describe('everything else is just sent back to the caller', () => {
			it('e.g strings', (done) => {
				let api = 'foo'

				let message = {
					apiName: name,
					version: version
				}

				server.addApiConstant(name, api, version)
				server.dispatch(message, (err, result) => {
					if (err) return done(err)
					expect(result).to.equal('foo')
					done()
				})
			})

			it('e.g numbers', (done) => {
				let api = 42

				let message = {
					apiName: name,
					version: version
				}

				server.addApiConstant(name, api, version)
				server.dispatch(message, (err, result) => {
					if (err) return done(err)
					expect(result).to.equal(42)
					done()
				})
			})

			it('e.g booleans', (done) => {
				let api = false

				let message = {
					apiName: name,
					version: version
				}

				server.addApiConstant(name, api, version)
				server.dispatch(message, (err, result) => {
					if (err) return done(err)
					expect(result).to.equal(false)
					done()
				})
			})
		})
	})

	it('has a special $metadata$ api', (done) => {
		let server = new Server()
		server.requireApiModule('fs', { startsWith: [] })
		server.addApiConstant('foo', 42)

		let message = {
			apiName: '$metadata$',
			version: '*',
			propertyName: 'getApis'
		}

		server.dispatch(message, (err, apis) => {
			if (err) return done(err)
			expect(apis).to.have.property('fs')
			expect(apis.fs.properties).to.eql(Object.keys(require('fs')))
			done()
		})
	})

	it.skip('replies with an error if api is missing', (done) => {

	})

	beforeEach(() => {
		server = new Server(socket)
	})
})