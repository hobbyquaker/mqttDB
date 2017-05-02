#!/usr/bin/env node

const log = require('yalm');
const Mqtt = require('mqtt');
const mw = require('mqtt-wildcard');
const config = require('./config.js');
const pkg = require('./package.json');
const api = require('./lib/api.js')(config);

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
            let data;
            try {
                data = JSON.parse(payload);
            } catch (err) {
                log.error('malformed payload', err);
                return;
            }
            api[cmd](id, data);
            break;
        case 'del':
            api.del(id);
            break;
        default:
            log.error('unknown cmd', cmd);
    }
});

api.on('ready', () => {
    Object.keys(api.db).forEach(id => {
        mqtt.publish(config.name + '/status/' + id, JSON.stringify(api.db[id]), {retain: true});
    });
    mqtt.publish(config.name + '/rev', String(api.rev), {retain: true});
    mqtt.publish(config.name + '/connected', '2', {retain: true});
});

api.on('update', (id, data) => {
    mqtt.publish(config.name + '/status/' + id, JSON.stringify(data), {retain: true});
    mqtt.publish(config.name + '/rev', String(api.rev), {retain: true});
});

api.on('error', err => {
    log.error(err);
});
