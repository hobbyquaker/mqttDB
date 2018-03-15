const os = require('os');
const config = require('yargs')
    .usage('Usage: $0 [options]')
    .describe('v', 'possible values: "error", "warn", "info", "debug"')
    .describe('n', 'instance name. used as topic prefix')
    .describe('u', 'mqtt broker url.')
    .describe('p', 'web server port')
    .describe('i', 'web server interface')
    .describe('x', 'diable web server')
    .describe('w', 'number of worker processes')
    .describe('r', 'disable retained publish of docs and views')
    .describe('s', 'timeout in milliseconds for map/reduce script execution')
    .describe('h', 'show help')
    .alias({
        h: 'help',
        i: 'web-interface',
        n: 'name',
        p: 'web-port',
        r: 'retain-disable',
        s: 'script-timeout',
        u: 'url',
        v: 'verbosity',
        w: 'workers',
        x: 'web-disable'
    })
    .default({
        u: 'mqtt://127.0.0.1',
        i: '0.0.0.0',
        n: '$db',
        v: 'info',
        p: 8092,
        w: os.cpus().length,
        s: 10000
    })
    .version()
    .help('help')
    .argv;

module.exports = config;
