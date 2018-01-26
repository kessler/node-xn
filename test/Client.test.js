'use strict'

const Client = require('../lib/Client')
const expect = require('chai').expect
const { METADATA_API_NAME } = require('../lib/Api')

describe('Client', () => {
	let client, adapter

	it('send a message', (done) => {
		let message = {
			apiName: 'test',
			propertyName: 'foo',
			args: [1, 2, 3]
		}

		client.sendMessage(message, (err, result) => {
			if (err) return done(err)

			expect(adapter.message).to.have.property('args')
			expect(adapter.message.args).to.deep.equal([1, 2, 3])
			expect(adapter.message).to.have.property('apiName', 'test')
			expect(adapter.message).to.have.property('propertyName', 'foo')

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
			this.mockData = {
				[METADATA_API_NAME]: {
					type: 'ApiModule',
					name: METADATA_API_NAME,
					version: '0.2.1',
					properties: ['getApis', '_findLatestVersion']
				},
				foo: {
					type: 'ApiModule',
					name: 'foo',
					version: '0.0.1',
					properties: ['bar']
				},
				boo: {
					type: 'ApiFunction',
					name: 'boo',
					version: '0.0.1'
				}
			}
		}

		send(message, callback) {
			this.message = message
			
			if (message.apiName === METADATA_API_NAME && message.propertyName === 'getApis') {
				return setImmediate(() => callback(null, this.mockData))
			}

			setImmediate(() => callback(null, 'bar'))
		}
	}
})