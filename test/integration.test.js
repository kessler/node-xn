'use strict'

const Server = require('../lib/Server')
const Client = require('../lib/Client')
const expect = require('chai').expect
const path = require('path')
const fs = require('fs')
const axon = require('axon')
const http = require('http')
const request = require('request')
const concatStream = require('concat-stream')

describe('Server and Client', () => {
	const filename = path.join(__dirname, 'test.txt')

	describe('use fs module to write a file', () => {
		it('connect client and server directly', (done) => {
			let server = new Server()
			
			server.addModule('fs')

			let client = new Client({
				send: (message, cb) => {
					server.dispatch(message, cb)
				}
			})

			client.refresh((err, rpc) => {
				if (err) return done(err)

				expect(rpc).to.equal(client.rpc)
				expect(client.rpc).to.have.property('fs')
				
				client.rpc.fs.writeFile(filename, 'test', (err) => {
					if (err) return done(err)

					expect(fs.readFileSync(filename, 'utf8')).to.equal('test')
					done()
				})
			})
		})

		it('connect client and server via axon sockets', (done) => {
			// create the rpc server
			let server = new Server()			
			server.addModule('fs')

			// create the axon sockets
			let rep = axon.socket('rep')
			let req = axon.socket('req')

			rep.bind(3000)
			req.connect(3000)

			rep.on('message', (message, reply) => {
				server.dispatch(message, reply)
			})
			
			// create the rpc client
			let client = new Client({
				send: (message, cb) => {
					req.send(message, cb)
				}
			})

			client.refresh((err) => {
				if (err) return done(err)

				client.rpc.fs.writeFile(filename, 'test', (err) => {
					if (err) return done(err)

					expect(fs.readFileSync(filename, 'utf8')).to.equal('test')
					done()
				})
			})
		})

		it('connect client and server via http interface', (done) => {
			// create the rpc server
			let rpcServer = new Server()			
			rpcServer.addModule('fs')

			function httpHandler(req, res) {
				req.pipe(concatStream((body) => {
					rpcServer.dispatch(JSON.parse(body), (err, result) => {
						if (err) {
							return res.end(JSON.stringify(err))
						}
					
						res.end(JSON.stringify(result))
					})
				}))
			}

			let httpServer = http.createServer(httpHandler).listen(8000)

			// create the rpc client
			let client = new Client({
				send: (message, cb) => {
					let req = request.post('http://localhost:8000', (err, res, body) => {
						if (err) return cb(err)
						
						let result
						
						if (body) {
							result = JSON.parse(body)
						}

						cb(null, result)					
					})

					req.write(JSON.stringify(message))
					req.end()
				}
			})

			client.refresh((err) => {
				if (err) return done(err)

				client.rpc.fs.writeFile(filename, 'test', (err) => {
					if (err) return done(err)

					expect(fs.readFileSync(filename, 'utf8')).to.equal('test')
					done()
				})
			})
		})
	})

	it('expose instance of class', (done) => {
		let server = new Server()
		class Foo { bar(cb) { cb(null, 123)}}
		let api = new Foo()

		server.addApi('foo', '0.0.1', api)

		let client = new Client({
			send: (message, cb) => {
				server.dispatch(message, cb)
			}
		})

		client.refresh((err, rpc) => {
			if (err) return done(err)
			rpc.foo.bar((err, result) => {
				if (err) return done(err)
				expect(result).to.equal(123)
				done()
			})
		})
	})

	beforeEach(() => {
		try {
			fs.unlinkSync(filename)
		} catch (e) {

		}
	})
})