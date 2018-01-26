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


// server.requireApiModule('fs')
// server.addApiFunction('meow', (arg, reply) => { reply(null, arg + ',foo') })
// server.addApiConstant('bar', 1)
// server.addApiModule('foo', { a: 1, b: (reply) => reply(null, 'bar') })


describe('Server and Client', () => {

	describe('use fs module to write a file', () => {
		const TEST_FILE = path.join(__dirname, 'test.txt')
		const EXPECTED_FILE_CONTENT = 'foobar'
		
		let server

		function runFsTest(client, done) {
			client.refresh((err, rpc) => {
				if (err) return done(err)

				expect(rpc).to.equal(client.rpc)
				expect(rpc).to.have.property('fs')
				expect(Object.keys(rpc.fs)).to.deep.equal(Object.keys(require('fs')))

				testFsWriteFile(rpc)
			})

			function testFsWriteFile(rpc) {
				rpc.fs.writeFile(TEST_FILE, EXPECTED_FILE_CONTENT, (err) => {
					if (err) return done(err)

					let actual = fs.readFileSync(TEST_FILE, 'utf8')
					expect(actual).to.equal(EXPECTED_FILE_CONTENT)
					done()
				})
			}
		}

		it('connect client and server directly', (done) => {
			let client = new Client({
				send: (message, reply) => {
					server.dispatch(message, reply)
				}
			})

			runFsTest(client, done)
		})

		it('connect client and server via axon sockets', (done) => {

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
				send: (message, reply) => {
					req.send(message, reply)
				}
			})

			runFsTest(client, done)
		})

		it('connect client and server via http interface', (done) => {
			
			function httpHandler(req, res) {
				req.pipe(concatStream((body) => {
					server.dispatch(JSON.parse(body), (err, result) => {
						if (err) {
							return done(err)
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

			runFsTest(client, done)
		})

		beforeEach(() => {
			try {
				fs.unlinkSync(TEST_FILE)
			} catch (e) {
				if (e.code !== 'ENOENT') {
					throw e
				}
			}

			server = new Server()

			// override default property name filters
			server.requireApiModule('fs', { startsWith: [] })
		})
	})

	it('expose instance of class', (done) => {
		let server = new Server()
		class Foo { bar(cb) { cb(null, 123) } }
		let api = new Foo()

		server.addApiModule('foo', api, '0.0.1')

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

	it('expose a function', (done) => {
		let server = new Server()
		let api = (a, b, cb) => {
			cb(null, a, b)
		}

		server.addApiFunction('foo', api, '0.0.1')

		let client = new Client({
			send: (message, cb) => {
				server.dispatch(message, cb)
			}
		})

		client.refresh((err, rpc) => {
			if (err) return done(err)
			rpc.foo(1, 2, (err, a, b) => {
				if (err) return done(err)
				expect(a).to.equal(1)
				expect(b).to.equal(2)
				done()
			})
		})
	})
})