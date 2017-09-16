const config = require('yargs')
    .usage('Usage: $0 [options]')
    .describe('v', 'possible values: "error", "warn", "info", "debug"')
    .describe('n', 'instance name. used as mqtt client id and as prefix for connected topic')
    .describe('u', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect-using-a-url')
    .describe('a', 'web server password for user admin')
    .describe('p', 'web server port')
    .describe('w', 'diable web server')
    .describe('h', 'show help')
    .alias({
        h: 'help',
        n: 'name',
        u: 'url',
        v: 'verbosity',
        a: 'web-password',
        w: 'web-disable',
        p: 'web-port'
    })
    .default({
        u: 'mqtt://127.0.0.1',
        n: 'meta',
        v: 'info',
        a: 'admin',
        p: 8089
    })
    .version()
    .help('help')
    .argv;

module.exports = config;
