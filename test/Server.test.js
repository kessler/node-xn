'use strict'

const expect = require('chai').expect
const Server = require('../lib/Server')

describe('Server', () => {
	let server, socket
	let name = 'test'
	let version = '0.0.1'

	describe('can expose', () => {
		it('objects as api', () => {
			let api = { x: () => {} }

			server.addApi(name, version, api)
			expect(server.getApi(name, version)).to.equal(api)
		})

		it('objects with functions as api', () => {
			let api = { }

			server.addApi(name, version, api)
			expect(server.getApi(name, version)).to.equal(api)
		})

		it('functions as api', () => {
			let api = () => {}

			server.addApi(name, version, api)
			expect(server.getApi(name, version)).to.equal(api)
		})

		it('strings as api', () => {
			let api = 'foo'

			server.addApi(name, version, api)
			expect(server.getApi(name, version)).to.equal(api)
		})

		it('numbers as api', () => {
			let api = 42

			server.addApi(name, version, api)
			expect(server.getApi(name, version)).to.equal(api)
		})

		it('boolean as api', () => {
			let api = false

			server.addApi(name, version, api)
			expect(server.getApi(name, version)).to.equal(api)
		})

		it('whole modules as api', () => {
			let api = require('http')

			server.addModule('http')
			expect(server.getApi('http', server.defaultVersion())).to.equal(api)
		})
	})

	describe('can dispatch messages to', () => {
		it('object apis', (done) => {
			let api = { x: (callback) => { callback(null, 'foo') } }

			let message = {
				apiName: name,
				version: version,
				methodName: 'x'
			}

			server.addApi(name, version, api)
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

			server.addApi(name, version, api)
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

				server.addApi(name, version, api)
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

				server.addApi(name, version, api)
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

				server.addApi(name, version, api)
				server.dispatch(message, (err, result) => {
					if (err) return done(err)
					expect(result).to.equal(false)
					done()
				})
			})
		})
	})

	it('has a special __metadata__ api', (done) => {
		let server = new Server()
		server.addModule('fs')
		server.addApi('foo', '0.0.1', 42)

		let message = {
			apiName: '__metadata__',
			version: '*',
			methodName: 'getApis'
		}

		server.dispatch(message, (err, apis) => {
			if (err) return done(err)

			expect(apis).to.have.property('fs')
			expect(apis.fs).to.eql(Object.keys(require('fs')))
			done()
		})
	})

	it.skip('replies with an error if apiName is missing', (done) => {

	})

	beforeEach(() => {
		server = new Server(socket)
	})
})
