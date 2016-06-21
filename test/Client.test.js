'use strict'

const Client = require('../lib/Client')
const expect = require('chai').expect

describe('Client', () => {
	let client, adapter

	it('send api calls WITH arguments', (done) => {
		client.sendApiMethodCall('test', '*', 'foo', [], (err, result) => {
			if (err) return done(err)
			expect(result).to.equal('bar')
			done()
		})
	})

	it('send api calls WITHOUT arguments', (done) => {
		client.sendApiCall('test', '*', (err, result) => {
			if (err) return done(err)
			expect(result).to.equal('bar')
			done()
		})
	})

	it('obtains a list of available apis from the Server, mounting them on client.rpc as normal methods', (done) => {
		client.refresh((err, rpc) => {
			if (err) return done(err)
			expect(rpc).to.equal(client.rpc)

			// expected remote apis
			expect(rpc).to.have.property('foo')
			expect(rpc).to.have.property('boo')

			// boo api
			expect(rpc.boo).to.be.instanceOf(Function)

			// foo api
			expect(rpc.foo).to.have.property('bar')

			rpc.foo.bar((err, result) => {
				if (err) return done(err)
				expect(result).to.equal('bar')
				done()
			})
		})
	})

	beforeEach(() => {
		adapter = new MockAdapter()
		client = new Client(adapter)
	})

	class MockAdapter {
		constructor() {
			this.__metadata__ = {
				foo: ['bar'],
				boo: []
			}
		}

		send(message, callback) {
			if (message.apiName === '__metadata__') {
				return setImmediate(() => {
					callback(null, this.__metadata__)
				})
			}
			this.message = message
			setImmediate(() => {
				callback(null, 'bar')
			})
		}
	}
})
