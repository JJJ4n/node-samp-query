# node-samp-query

Simplified Query API for SAMP.
Original JJJ4n's repo seems to be abandoned, so I made fork with some improvements.

```sh
npm install DimaCrafter/node-samp-query
# OR
yarn add DimaCrafter/node-samp-query
```

## Usage

Available options:

| Field     | Default   | Description                          |
|-----------|-----------|--------------------------------------|
| `host`    | 127.0.0.1 | Hostname or IP-address of the server |
| `port`    | 7777      | Game server port                     |
| `timeout` | 1000      | Maximum response waiting time in ms  |

```js
const { sampQuery } = require('samp-query');

const options = {
    host: '123.45.67.89',
    // Or hostname also can be a domain with A record
    host: 'play.myserver.net',

    // Optional fields
    port: 7777,
    timeout: 1500
};

function main () {
    // Callback style
    sampQuery(options)
        .then(info => console.log(info))
        .catch(error => console.log(error));
}

async function main () {
    // Async style
    try {
        const info = await sampQuery(options);
        console.log(info);
    } catch (error) {
        console.log(error);
    }
}

// Calling just created async function because NodeJS still can't handle top-level await :(
main();
```

## Sample outputs

```js
{
    ping: 28,
    hasPassword: false,
    playersOnline: 3,
    maxPlayers: 20,
    serverName: 'My SA:MP Server',
    gameMode: 'Custom DM',
    language: 'San Andreas',
    rules: {
        lagcomp: true,
        mapname: 'San Andreas',
        version: '0.3.7-R2',
        weather: 17,
        weburl: 'myserver.net',
        worldtime: '12:00'
    },
    players: [
        { id: 0, name: 'JJJ4n', score: 87211, ping: 51 },
        { id: 1, name: 'DummyPlayer', score: 0, ping: 81 },
        { id: 2, name: 'AnotherOne', score: 20354, ping: 41 }
    ]
}
```

### Error outputs

```txt
SampError: Request timeout
SampError: Invalid response received
SampError: Invalid port
SampError: Hostname resolved to empty list
```
