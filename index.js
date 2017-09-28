#!/usr/bin/env node

const path = require('path');
const http = require('http');
const express = require('express');

const app = express();

const server = http.Server(app); // eslint-disable-line new-cap
const io = require('socket.io')(server);

const log = require('yalm');
const Mqtt = require('mqtt');
const mw = require('mqtt-wildcard');
const config = require('./config.js');
const pkg = require('./package.json');
const Core = require('./lib/core.js');

log.setLevel(config.verbosity);

const core = new Core(config, log);

let mqttConnected = false;

log.info(pkg.name + ' ' + pkg.version + ' starting');
log.info('mqtt trying to connect', config.url);

const mqtt = Mqtt.connect(config.url, {will: {topic: config.name + '/connected', payload: '0', retain: true}});

mqtt.on('connect', () => {
    mqttConnected = true;

    log.info('mqtt connected', config.url);
    mqtt.publish(config.name + '/connected', '1', {retain: true});

    log.debug('mqtt subscribe', config.name + '/set/#');
    mqtt.subscribe(config.name + '/set/#');
    log.debug('mqtt subscribe', config.name + '/extend/#');
    mqtt.subscribe(config.name + '/extend/#');
    log.debug('mqtt subscribe', config.name + '/prop/#');
    mqtt.subscribe(config.name + '/prop/#');
    log.debug('mqtt subscribe', config.name + '/query/#');
    mqtt.subscribe(config.name + '/query/#');
});

mqtt.on('close', () => {
    if (mqttConnected) {
        mqttConnected = false;
        log.info('mqtt closed ' + config.url);
    }
});

/* istanbul ignore next */
mqtt.on('error', err => {
    log.error('mqtt', err);
});

mqtt.on('offline', () => {
    log.warn('mqtt offline');
});

mqtt.on('reconnect', () => {
    log.info('mqtt reconnect');
});

mqtt.on('message', (topic, payload) => {
    payload = payload.toString();
    log.debug('mqtt <', topic, payload);
    const match = mw(topic, config.name + '/+/#');
    const [cmd, id] = match;

    if (!match || !id) {
        log.error('malformed topic', topic);
        return;
    }

    /* eslint-disable no-case-declarations */
    switch (cmd) {
        case 'set':
        case 'extend':
        case 'query':
        case 'prop':
            let data;
            if (payload === '') {
                data = payload;
            } else {
                try {
                    data = JSON.parse(payload);
                } catch (err) {
                    log.error('malformed payload', err);
                    return;
                }
            }
            try {
                core[cmd](id, data);
            } catch (err) {
                /* istanbul ignore next */
                log.error('error in mqtt message handler', err.message);
            }

            break;

        /* istanbul ignore next */
        default:
            log.error('unknown cmd', cmd);
    }
});

core.on('ready', () => {
    const oIds = Object.keys(core.db);
    oIds.forEach(id => {
        mqtt.publish(config.name + '/doc/' + id, JSON.stringify(core.db[id]), {retain: true});
    });
    if (oIds.length > 0) {
        log.info('published ' + oIds.length + ' objects');
    }
    mqtt.publish(config.name + '/rev', String(core.rev), {retain: true});
    mqtt.publish(config.name + '/connected', '2', {retain: true});
});

core.on('update', (id, data) => {
    log.debug('mqtt >', id, 'rev', data.rev);
    mqtt.publish(config.name + '/doc/' + id, JSON.stringify(data), {retain: true});
    log.debug('mqtt > rev', core.rev);
    mqtt.publish(config.name + '/rev', String(core.rev), {retain: true});
    io.emit('objectIds', Object.keys(core.db));
});

core.on('view', (id, data) => {
    io.emit('updateView', id);
    if (data && data.error) {
        log.error('view', id, ':', data);
    } else {
        log.debug('view', id, 'rev', core.views[id] && core.views[id]._rev);
    }
    const payload = data ? JSON.stringify(data) : '';
    mqtt.publish(config.name + '/view/' + id, payload, {retain: true});
    io.emit('viewIds', Object.keys(core.views));
});

core.on('error', err => {
    log.error(err);
});

if (!config.webDisable) {
    server.listen(config.webPort, config.webInterface);
    log.info('http server listening on ' + config.webInterface + ':' + config.webPort);

    app.get('/', (req, res) => {
        res.redirect(301, '/ui');
    });
    app.use('/ui', express.static(path.join(__dirname, '/ui')));
    app.use('/node_modules', express.static(path.join(__dirname, '/node_modules')));

    io.on('connection', socket => {
        io.emit('objectIds', Object.keys(core.db));
        io.emit('viewIds', Object.keys(core.views));

        socket.on('getObject', (id, cb) => {
            cb(core.db[id]);
        });

        socket.on('getView', (id, cb) => {
            cb({id, query: core.queries[id], view: core.views[id]});
        });

        socket.on('set', (id, data, cb) => {
            if (data._rev === null || !core.db[id] || data._rev === core.db[id]._rev) {
                core.set(id, data);
                socket.emit('objectIds', Object.keys(core.db).sort());
                cb('ok');
            } else {
                cb('rev mismatch ' + core.db[id]._rev);
            }
        });

        socket.on('del', (id, cb) => {
            core.del(id);
            cb('ok');
            socket.emit('objectIds', Object.keys(core.db).sort());
        });

        socket.on('query', (id, payload, cb) => {
            core.query(id, payload);
            cb('ok');
            socket.emit('viewIds', Object.keys(core.views).sort());
        });
    });
}
