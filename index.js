const { createSocket } = require('dgram');
const { decodeWin1251, resolveHostname, SampError } = require('./utils');

/**
 * @typedef SampInfoResponse
 * @prop {number} ping
 * @prop {boolean} hasPassword
 * @prop {number} playersOnline
 * @prop {number} maxPlayers
 * @prop {string} serverName
 * @prop {string} gameMode
 * @prop {string} language
 */

/**
 * @typedef SampRules
 * @prop {boolean} lagcomp
 * @prop {string} mapname
 * @prop {string} version
 * @prop {number} weather
 * @prop {string} weburl
 * @prop {string} worldtime
 */

/**
 * @typedef SampPlayer
 * @prop {number} id
 * @prop {string} name
 * @prop {number} score
 * @prop {number} ping
 */

class SampSocket {
    /** @type {string} */ host;
    /** @type {number} */ port;
    /** @type {number} */ timeout;
    constructor (options) {
        Object.assign(this, options);
    }

    /**
     * @param {Buffer} packet
     * @returns {Promise<import('dgram').Socket>}
     */
    send (packet) {
        return new Promise((resolve, reject) => {
            const client = createSocket('udp4');
            client.send(packet, 0, packet.length, this.port, this.host, (error, _bytesSent) => {
                if (error) reject(error);
                else resolve(client);
            });
        });
    }

    /**
     * Makes UDP request to SAMP server
     * @param {number} opcode Operation code byte
     * @returns {Promise<Buffer>}
     */
    request (opcode) {
        const packet = Buffer.alloc(11);
        packet.write('SAMP');

        for (var i = 0; i < 4; ++i) {
            packet[i + 4] = +this.host.split('.')[i];
        }

        packet.writeInt16LE(this.port, 8);
        packet[10] = opcode;

        return this.send(packet).then(client => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new SampError('Request timeout'));
                }, this.timeout);

                client.once('message', message => {
                    clearTimeout(timeout);
                    client.close();

                    if (message.length < 11) {
                        reject(new SampError('Invalid response received'));
                    } else {
                        resolve(message.subarray(11));
                    }
                });
            });
        });
    }

    static INFO_OPCODE = 'i'.charCodeAt(0);
    /** @returns {Promise<SampInfoResponse>} */
    async queryInfo () {
        const pingStart = Date.now();
        const message = await this.request(SampSocket.INFO_OPCODE);

        // Low ping accuracy but it's fine for querying
        /** @type {any} */
        const info = { ping: Date.now() - pingStart };
        let strLength = 0;
        let offset = 0;

        info.hasPassword = message.readUInt8(offset) != 0;
        offset += 1;

        info.playersOnline = message.readUInt16LE(offset);
        offset += 2;

        info.maxPlayers = message.readUInt16LE(offset);
        offset += 2;

        strLength = message.readUInt16LE(offset);
        offset += 4;

        info.serverName = decodeWin1251(message, offset, offset += strLength);

        strLength = message.readUInt16LE(offset);
        offset += 4;

        info.gameMode = decodeWin1251(message, offset, offset += strLength);

        strLength = message.readUInt16LE(offset);
        offset += 4;

        info.language = decodeWin1251(message, offset, offset += strLength);

        return info;
    }

    static RULES_OPCODE = 'r'.charCodeAt(0);
    /** @returns {Promise<SampRules>} */
    async queryRules () {
        const message = await this.request(SampSocket.RULES_OPCODE);

        /** @type {any} */
        const rules = {};
        let strLength = 0;
        let offset = 0;

        let ruleCount = message.readUInt16LE(offset);
        offset += 2;

        for (; ruleCount > 0; ruleCount--) {
            strLength = message.readUInt8(offset);
            offset++;

            const property = decodeWin1251(message, offset, offset += strLength);

            strLength = message.readUInt8(offset);
            offset++;

            rules[property] = decodeWin1251(message, offset, offset += strLength);
        }

        rules.lagcomp = rules.lagcomp === 'On';
        rules.weather = +rules.weather;

        return rules;
    }

    static DATA_OPCODE = 'd'.charCodeAt(0);
    /** @returns {Promise<SampPlayer[]>} */
    async queryPlayers () {
        const message = await this.request(SampSocket.DATA_OPCODE);

        const players = [];
        let strLength = 0;
        let offset = 0;

        var playerCount = message.readUInt16LE(offset)
        offset += 2

        for (; playerCount > 0; playerCount--) {
            const player = {};

            player.id = message.readUInt8(offset)
            offset++;

            strLength = message.readUInt8(offset)
            offset++;

            player.name = decodeWin1251(message, offset, offset += strLength);

            player.score = message.readUInt16LE(offset)
            offset += 4;

            player.ping = message.readUInt16LE(offset)
            offset += 4;

            players.push(player);
        }

        return players;
    }

    /** @returns {Promise<SampInfoResponse & { rules: SampRules, players: SampPlayer[] }>} */
    async query () {
        const info = await this.queryInfo();
        const rules = await this.queryRules();
        // For some reason original code doesn't handle long player list,
        // but I removed limit and it worked correct for 116 players
        const players = await this.queryPlayers();

        return Object.assign(info, { rules, players });
    }
}

async function sampQuery (options) {
    options.host = await resolveHostname(options.host || '127.0.0.1');
    options.port ||= 7777;
    options.timeout ||= 1000;

    if (!isFinite(options.port) || options.port < 1 || options.port > 65535) {
        throw new SampError('Invalid port');
    }

    const socket = new SampSocket(options);
    return await socket.query();
}

module.exports = { SampSocket, sampQuery };
