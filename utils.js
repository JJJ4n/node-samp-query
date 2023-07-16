const { resolve: dnsResolve } = require('dns');
const iconv = require('iconv-lite');

class SampError extends Error {};
exports.SampError = SampError;

/**
 * @param {string} hostname Hostname to resolve
 * @returns {Promise<string>} Resolved IP-address
 */
exports.resolveHostname = hostname => {
	return new Promise((resolve, reject) => {
		dnsResolve(hostname, (error, addresses) => {
			if (error) {
				reject(error);
			} else if (addresses.length == 0) {
				reject(new SampError('Hostname resolved to empty list'));
			} else {
				// For game servers there is usually one record
				resolve(addresses[0]);
			}
		});
	});
}

/**
 * @param {Buffer} buffer
 * @param {number} start
 * @param {number} end
 * @returns {string}
 */
exports.decodeWin1251 = (buffer, start, end) => {
	return iconv.decode(buffer.subarray(start, end), 'win1251');
}
