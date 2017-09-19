#!/usr/bin/env node

const path = require('path');
const log = require('yalm');
const Mqtt = require('mqtt');
const mw = require('mqtt-wildcard');
const express = require('express');
const bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');
const config = require('./config.js');
const pkg = require('./package.json');
const Api = require('./lib/api.js');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const api = new Api(config);

let mqttConnected = false;

log.setLevel(config.verbosity);

log.info(pkg.name + ' ' + pkg.version + ' starting');
log.info('mqtt trying to connect', config.url);

const mqtt = Mqtt.connect(config.url, {will: {topic: config.name + '/connected', payload: '0', retain: true}});

mqtt.on('connect', () => {
    mqttConnected = true;

    log.info('mqtt connected', config.url);
    mqtt.publish(config.name + '/connected', '1', {retain: true});

    log.info('mqtt subscribe', config.name + '/set/#');
    mqtt.subscribe(config.name + '/set/#');
    log.info('mqtt subscribe', config.name + '/del/#');
    mqtt.subscribe(config.name + '/del/#');
    log.info('mqtt subscribe', config.name + '/extend/#');
    mqtt.subscribe(config.name + '/extend/#');
    log.info('mqtt subscribe', config.name + '/query/#');
    mqtt.subscribe(config.name + '/query/#');
});

mqtt.on('close', () => {
    if (mqttConnected) {
        mqttConnected = false;
        log.info('mqtt closed ' + config.url);
    }
});

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

    if (!match) {
        log.error('malformed topic', topic);
        return;
    }

    /* eslint-disable no-case-declarations */
    switch (cmd) {
        case 'set':
        case 'extend':
        case 'query':
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
                api[cmd](id, data);
            } catch (err) {
                log.error('error in mqtt message handler', err.message);
            }

            break;
        case 'del':
            api.del(id);
            break;

        default:
            log.error('unknown cmd', cmd);
    }
});

api.on('ready', () => {
    log.info('publishing all objects');
    Object.keys(api.db).forEach(id => {
        mqtt.publish(config.name + '/status/' + id, JSON.stringify(api.db[id]), {retain: true});
    });
    mqtt.publish(config.name + '/rev', String(api.rev), {retain: true});
    log.info('creating views');
    Object.keys(api.views).forEach(id => {
        api.query(id, {condition: api.views[id].condition, filter: api.views[id].filter}, true);
    });
    mqtt.publish(config.name + '/connected', '2', {retain: true});
});

api.on('update', (id, data) => {
    log.debug('update', id);
    mqtt.publish(config.name + '/status/' + id, JSON.stringify(data), {retain: true});
    mqtt.publish(config.name + '/rev', String(api.rev), {retain: true});
});

api.on('view', (id, data) => {
    io.emit('updateView', id);
    if (data && data.error) {
        log.error('view', id, ':', data);
    } else {
        log.debug('view', id, data.length);
    }
    const payload = data ? JSON.stringify(data) : '';
    mqtt.publish(config.name + '/view/' + id, payload, {retain: true});
});

api.on('error', err => {
    log.error(err);
});

if (!config.webDisable) {
    server.listen(config.webPort);
    log.info('http server listening on port', config.webPort);

    /*
    app.use(basicAuth({
        users: {admin: config.webPassword},
        challenge: true,
        realm: 'mqtt-meta ui'
    }));
    */

    app.get('/', (req, res) => {
        res.redirect(301, '/ui');
    });
    app.use('/ui', express.static(path.join(__dirname, '/ui')));
    app.use('/node_modules', express.static(path.join(__dirname, '/node_modules')));

    io.on('connection', socket => {
        socket.emit('objectIds', Object.keys(api.db).sort());
        socket.emit('viewIds', Object.keys(api.views).sort());

        socket.on('getObject', (id, cb) => {
            cb(api.db[id]);
        });

        socket.on('getView', (id, cb) => {
            cb(api.views[id]);
        });

        socket.on('set', (id, data, cb) => {
            if (data._rev === null || data._rev === api.db[id]._rev) {
                api.set(id, data);
                socket.emit('objectIds', Object.keys(api.db).sort());
                cb('ok');
            } else {
                cb('rev mismatch ' + api.db[id]._rev);
            }
        });

        socket.on('del', (id, cb) => {
            api.del(id);
            cb('ok');
            socket.emit('objectIds', Object.keys(api.db).sort());
        });

        socket.on('query', (id, payload, cb) => {
            api.query(id, payload);
            cb('ok');
            socket.emit('viewIds', Object.keys(api.views).sort());
        });
    });

    /*
    app.get('/ids', (req, res) => {
        res.end(JSON.stringify(Object.keys(api.db).sort()));
    });

    app.get('/views', (req, res) => {
        res.end(JSON.stringify(Object.keys(api.views).sort()));
    });

    app.get('/view', (req, res) => {
        if (api.views[req.query.id]) {
            res.end(JSON.stringify(api.views[req.query.id]));
        } else {
            res.end('');
        }
    });

    app.get('/object', (req, res) => {
        if (api.db[req.query.id]) {
            res.end(JSON.stringify(api.db[req.query.id]));
        } else {
            res.end('');
        }
    });

    app.get('/delete', (req, res) => {
        res.end(api.del(req.query.id));
    });

    app.post('/object', bodyParser.json(), (req, res) => {
        if (req.body.obj._rev === null || req.body.obj._rev === api.db[req.body.id]._rev) {
            api.set(req.body.id, req.body.obj);
            res.end('ok');
        } else {
            res.end('rev mismatch ' + api.db[req.body.id]._rev);
        }
    });
    app.post('/view', bodyParser.json(), (req, res) => {

        api.query(req.body.id, {condition: req.body.condition, filter: req.body.filter});
        res.end('ok');
    });
    */
}
