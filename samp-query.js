var dgram = require('dgram')

var query = function (options, callback) {

	var self = this

	if(typeof options === 'string') options.host = options
	else options.host = options.host
	options.port = options.port || 7777
	options.timeout = options.timeout || 1000
	
	if(!options.host) 
		return callback.apply(options, [ 'Invalid host' ])

	if(!isFinite(options.port) || options.port < 1 || options.port > 65535) 
		return callback.apply(options, [ 'Invalid port' ])

	var response = {}

	request.call(self, options, 'i', function(error, information) {
		if(error) return callback.apply(options, [ error ])

		response.address		= options.host
		response.hostname 		= information.hostname
		response.gamemode 		= information.gamemode
		response.mapname 		= information.mapname
		response.passworded 	= information.passworded
		response.maxplayers 	= information.maxplayers
		response.online			= information.players

		request.call(self, options, 'r', function(error, rules) {
			if(error) return callback.apply(options, [ error ])

			response.rules = rules

			request.call(self, options, 'd', function(error, players) {
				if(error) return callback.apply(options, [ error ])

				response.players = players

				return callback.apply(options, [ false, response ])
			})
		})
	})
}

var request = function(options, opcode, callback) {

	var socket 		= dgram.createSocket("udp4")
	var packet 		= new Buffer(10 + opcode.length)

	packet.write('SAMP')

	for(var i = 0; i < 4; ++i) 
	packet[i + 4] 	= options.host.split('.')[i]

	packet[8] 		= options.port & 0xFF
	packet[9] 		= options.port >> 8 & 0xFF
	packet[10] 		= opcode.charCodeAt(0)

	try {
		socket.send(packet, 0, packet.length, options.port, options.host, function(error, bytes) {
			if(error) 
				return callback.apply(options, [ error ])

		})
	} catch(error) {
		return callback.apply(options, [ error ])
	}

	var controller = undefined

	var onTimeOut = function() {
		socket.close()
		return callback.apply(options, [ 'Host unavailable' ])
	}

	controller = setTimeout(onTimeOut, options.timeout)

	socket.on('message', function (message) {

		if(controller)
			clearTimeout(controller)

		if(message.length < 11) return callback.apply(options, [ true ])
		else {
			socket.close()

			message 	= message.slice(11)

			var object 	= {}
			var array 	= []
			var strlen 	= 0
			var offset 	= 0

			try {

				if(opcode == 'i') {
				
					object.passworded 	= message.readUInt8(offset)
					offset += 1

					object.players 		= message.readUInt16LE(offset)
					offset += 2

					object.maxplayers 	= message.readUInt16LE(offset)
					offset += 2

					strlen 				= message.readUInt32LE(offset)
					offset += 4

					object.hostname 	= message.toString(undefined, offset, offset += strlen)

					strlen 				= message.readUInt32LE(offset)
					offset += 4

					object.gamemode 	= message.toString(undefined, offset, offset += strlen)

					strlen 				= message.readUInt32LE(offset)
					offset += 4

					object.mapname 		= message.toString(undefined, offset, offset += strlen)

					return callback.apply(options, [ false, object ])

				}

				if(opcode == 'r') {

					var rulecount 		= message.readUInt16LE(offset)
					offset += 2

					var property, value = undefined

					while(rulecount) {

						strlen 			= message.readUInt8(offset)
						++offset

						property 		= message.toString(undefined, offset, offset += strlen)

						strlen 			= message.readUInt8(offset)
						++offset

						value 			= message.toString(undefined, offset, offset += strlen)

						object[property] = value

						--rulecount
					}

					return callback.apply(options, [ false, object ])
				}

				if(opcode == 'd') {

					var playercount 	= message.readUInt16LE(offset)
					offset += 2

					var player = undefined;

					while(playercount) {

						player = {}

						player.id 		= message.readUInt8(offset)
						++offset

						strlen 			= message.readUInt8(offset)
						++offset

						player.name 	= message.toString(undefined, offset, offset += strlen)

						player.score 	= message.readUInt32LE(offset)
						offset += 4

						player.ping 	= message.readUInt32LE(offset)
						offset += 4

						array.push(player)

						--playercount
					}

					return callback.apply(options, [ false, array ])
				}

			} catch (exception) {
				return callback.apply(options, [ exception ])
			}
		}
	})
}

module.exports = query
