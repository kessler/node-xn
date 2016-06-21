'use strict'

const Server = require('../lib/Server')
const Client = require('../lib/Client')
const expect = require('chai').expect

describe('Server and Client', () => {
	it('remotely use http module', (done) => {
		let server = new Server()
		
		server.addModule('http')

		let client = new Client({
			send: function(message, cb) {
				server.dispatch(message, (err, result) => {
					if (err) return cb(err)
					cb(err, result)
				})
			}
		})

		client.refresh((err, rpc) => {
			if (err) return done(err)
			expect(rpc).to.equal(client.rpc)
			expect(client.rpc).to.have.property('http')
			done()
		})
	})
})