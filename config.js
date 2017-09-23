const config = require('yargs')
    .usage('Usage: $0 [options]')
    .describe('v', 'possible values: "error", "warn", "info", "debug"')
    .describe('n', 'instance name. used as mqtt client id and as prefix for connected topic')
    .describe('u', 'mqtt broker url.')
    .describe('p', 'web server port')
    .describe('i', 'web server interface')
    .describe('w', 'diable web server')
    .describe('h', 'show help')
    .alias({
        h: 'help',
        n: 'name',
        u: 'url',
        v: 'verbosity',
        i: 'web-interface',
        w: 'web-disable',
        p: 'web-port'
    })
    .default({
        u: 'mqtt://127.0.0.1',
        i: '0.0.0.0',
        n: 'db',
        v: 'info',
        p: 8092
    })
    .version()
    .help('help')
    .argv;

module.exports = config;
