const debug = require('debug')

module.exports = (name) => {
	return debug('xn:' + name)
}