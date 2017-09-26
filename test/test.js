/* global describe, it, should */

require('should');

const path = require('path');
const cp = require('child_process');
const streamSplitter = require('stream-splitter');

const Mqtt = require('mqtt');
const mqtt = Mqtt.connect('mqtt://127.0.0.1');

const dbId = 'db' + Math.random().toString(16).substr(2, 8);

const cmd = path.join(__dirname, '..', 'index.js');
const cmdArgs = ['-v', 'debug', '-n', dbId];

let proc;
let procPipeOut;
let procPipeErr;
let subIndex = 0;
const procSubscriptions = {};
const procBuffer = [];

function procSubscribe(rx, cb) {
    subIndex += 1;
    procSubscriptions[subIndex] = {rx, cb};
    matchSubscriptions();
    return subIndex;
}

function procUnsubscribe(subIndex) {
    delete procSubscriptions[subIndex];
}

function matchSubscriptions(data) {
    let subs = procSubscriptions;
    let buf = procBuffer;
    if (data) {
        buf.push(data);
    }
    buf.forEach((line, index) => {
        Object.keys(subs).forEach(key => {
            const sub = subs[key];
            if (line.match(sub.rx)) {
                sub.cb(line);
                delete subs[key];
                buf.splice(index, 1);
            }
        });
    });
}

function startDb() {
    proc = cp.spawn(cmd, cmdArgs);
    procPipeOut = proc.stdout.pipe(streamSplitter('\n'));
    procPipeErr = proc.stderr.pipe(streamSplitter('\n'));
    
    procPipeOut.on('token', data => {
        console.log('db', data.toString());
        matchSubscriptions(data.toString());
    });
    procPipeErr.on('token', data => {
        console.log('db', data.toString());
        matchSubscriptions(data.toString());
    });
}

const mqttSubscriptions = [];

mqtt.on('message', (topic, payload) => {
    payload = payload.toString();
    console.log('mqtt <', topic);
    mqttSubscriptions.forEach((sub, index) => {
        if (sub.topic === topic) {
            const callback = sub.callback;
            if (sub.once) {
                mqttSubscriptions.splice(index, 1);
            }
            if (payload !== '') {
                payload = JSON.parse(payload)
            }
            callback(payload);
        }
    });
});

function mqttSubscribeOnce(topic, callback) {
    mqttSubscriptions.push({topic, callback, once: true});
    mqtt.subscribe(topic);
}


describe('start daemons', () => {
    it('mqttDB should start without error', function (done)  {
        this.timeout(20000);
        procSubscribe(/mqttdb [0-9.]+ starting/, data => {
            done();
        });
        startDb();
    });
    it('should connect to the mqtt broker', function (done) {
        this.timeout(20000);
        procSubscribe(/mqtt connected/, data => {
            done();
        });
    });
    it('should spawn workers', function (done) {
        this.timeout(20000);
        procSubscribe(/all workers ready/, data => {
            done();
        });
    });
    it('should complete init', function (done) {
        this.timeout(20000);
        procSubscribe(/init complete/, data => {
            done();
        });
    });
    it('should subscribe to set', function (done) {
        procSubscribe(/mqtt subscribe db[0-9a-f]+\/set\/#/, () => {
            done();
        });
    });
    it('should subscribe to extend', function (done) {
        procSubscribe(/mqtt subscribe db[0-9a-f]+\/extend\/#/, () => {
            done();
        });
    });
    it('should subscribe to prop', function (done) {
        procSubscribe(/mqtt subscribe db[0-9a-f]+\/prop\/#/, () => {
            done();
        });
    });
    it('should subscribe to query', function (done) {
        procSubscribe(/mqtt subscribe db[0-9a-f]+\/query\/#/, () => {
            done();
        });
    });
});

describe('document test1', () => {
    it('should create a document', function (done) {
        this.timeout(20000);
        const doc = {type: 'test'};
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            should.deepEqual({type: 'test', _id: 'test1', _rev: 0}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/set/test1', JSON.stringify(doc));
        }, 500);
    });
    it('should extend a document', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            should.deepEqual({type: 'test', _id: 'test1', _rev: 1, muh: 'kuh'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/extend/test1', JSON.stringify({muh: 'kuh'}));
        }, 500);
    });
    it('should delete a document', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            payload.should.equal('');
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/set/test1', '');
        }, 500);
    });
});



describe('stop daemon', () => {
    it('should stop mqttDB', function (done) {
        proc.on('close', () => {
            done();
        });
        proc.kill('SIGTERM');
    });
});
