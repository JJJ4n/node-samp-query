var dgram = require('dgram')

var query = function (options, callback) {

	var self = this

	if(typeof options === 'string') this.host = options
	else this.host = options.host
	this.port = options.port || 7777
	this.timeout = options.timeout || 1000
	
	if(!this.host) 
		return callback.apply(this, [ 'Invalid host' ])

	if(!isFinite(this.port) || this.port < 1 || this.port > 65535) 
		return callback.apply(this, [ 'Invalid port' ])

	var response = {}

	request.call(self, 'i', function(error, information) {
		if(error) return callback.apply(this, [ error ])

		response.address		= self.host
		response.hostname 		= information.hostname
		response.gamemode 		= information.gamemode
		response.mapname 		= information.mapname
		response.passworded 	= information.passworded
		response.maxplayers 	= information.maxplayers
		response.online			= information.players

		request.call(self, 'r', function(error, rules) {
			if(error) return callback.apply(this, [ error ])

			response.rules = rules

			request.call(self, 'd', function(error, players) {
				if(error) return callback.apply(this, [ error ])

				response.players = players

				return callback.apply(this, [ false, response ])
			})
		})
	})
}

var request = function(opcode, callback) {

	var socket 		= dgram.createSocket("udp4")
	var packet 		= new Buffer(10 + opcode.length)

	packet.write('SAMP')

	for(var i = 0; i < 4; ++i) 
	packet[i + 4] 	= this.host.split('.')[i]

	packet[8] 		= this.port & 0xFF
	packet[9] 		= this.port >> 8 & 0xFF
	packet[10] 		= opcode.charCodeAt(0)

	try {
		socket.send(packet, 0, packet.length, this.port, this.host, function(error, bytes) {
			if(error) 
				return callback.apply(this, [ error ])

		})
	} catch(error) {
		return callback.apply(this, [ error ])
	}

	var controller = undefined

	var onTimeOut = function() {
		socket.close()
		return callback.apply(this, [ 'Host unavailable' ])
	}

	controller = setTimeout(onTimeOut, this.timeout)

	socket.on('message', function (message) {

		if(controller)
			clearTimeout(controller)

		if(message.length < 11) return callback.apply(this, [ true ])
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

					return callback.apply(this, [ false, object ])

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

					return callback.apply(this, [ false, object ])
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

					return callback.apply(this, [ false, array ])
				}

			} catch (exception) {
				return callback.apply(this, [ exception ])
			}
		}
	})
}

module.exports = query