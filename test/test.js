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

mqtt.on('message', (topic, payload, options) => {
    payload = payload.toString();
    mqttSubscriptions.forEach((sub, index) => {
        if (sub.topic === topic) {
            const callback = sub.callback;
            if (!sub.retain && options.retain) {
                return;
            }
            if (sub.once) {
                mqttSubscriptions.splice(index, 1);
                console.log('mqtt unsubscribe', sub.topic);
                mqtt.unsubscribe(sub.topic);
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
    console.log('mqtt subscribe', topic);
    mqtt.subscribe(topic);
}

function mqttSubscribeOnceRetain(topic, callback) {
    mqttSubscriptions.push({topic, callback, once: true, retain: true});
    console.log('mqtt subscribe', topic);
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
    it('should set a property', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            should.deepEqual({type: 'test', _id: 'test1', _rev: 2, muh: 'kuh', bla: 'blubb'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/prop/test1', JSON.stringify({method: 'set', prop: 'bla', val: 'blubb'}));
        }, 500);
    });
    it('should overwrite a property', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            should.deepEqual({type: 'test', _id: 'test1', _rev: 3, muh: 'kuh', bla: 'bla'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/prop/test1', JSON.stringify({method: 'set', prop: 'bla', val: 'bla'}));
        }, 500);
    });
    it('should create a property', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            should.deepEqual({type: 'test', _id: 'test1', _rev: 4, muh: 'kuh', bla: 'bla', foo: 'bar'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/prop/test1', JSON.stringify({method: 'create', prop: 'foo', val: 'bar'}));
        }, 500);
    });

    it('should should not overwrite a property', function (done) {
        this.timeout(20000);

        setTimeout(() => {
            mqtt.publish(dbId + '/prop/test1', JSON.stringify({method: 'create', prop: 'muh', val: 'no!'}));
        }, 500);

        setTimeout(() => {
            mqttSubscribeOnceRetain(dbId + '/doc/test1', payload => {
                should.deepEqual({type: 'test', _id: 'test1', _rev: 4, muh: 'kuh', bla: 'bla', foo: 'bar'}, payload);
                done();
            });
        }, 2000);
    });

    it('should should delete a property', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            should.deepEqual({type: 'test', _id: 'test1', _rev: 5, muh: 'kuh', bla: 'bla'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/prop/test1', JSON.stringify({method: 'del', prop: 'foo'}));
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

describe('view test1', () => {
    it('should create a view', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test1', payload => {
            should.deepEqual({ _id: 'test1', _rev: 0, result: [], length: 0 }, payload);
            done();
        });
        mqtt.publish(dbId + '/query/test1', JSON.stringify({filter: '#', map: 'if (this.type === "muh") emit(this._id)', reduce: 'return result'}));
    });
    it('should publish the new view after adding a document', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test1', payload => {
            should.deepEqual({ _id: 'test1', _rev: 1, result: [ 'doc1' ], length: 1 }, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/set/doc1', JSON.stringify({type: 'muh'}));
        }, 2000);
    });
    it('should not change the view after adding a document not matching the query', function (done) {
        this.timeout(20000);
        mqtt.publish(dbId + '/set/doc2', JSON.stringify({type: 'foo'}));
        setTimeout(() => {
            mqttSubscribeOnceRetain(dbId + '/view/test1', payload => {
                console.log('!!!', payload);
                should.deepEqual({ _id: 'test1', _rev: 1, result: [ 'doc1' ], length: 1 }, payload);
                done();
            });
        }, 2000);
    });
    it('should publish the new view after altering the query', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test1', payload => {
            should.deepEqual({ _id: 'test1', _rev: 2, result: [ 'doc2' ], length: 1 }, payload);
            done();
        });
        mqtt.publish(dbId + '/query/test1', JSON.stringify({filter: '#', map: 'if (this.type === "foo") emit(this._id)', reduce: 'return result'}));
    });
    it('should delete the view', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test1', payload => {
            payload.should.equal('');
            done();
        });
        mqtt.publish(dbId + '/query/test1', '');
    });
});

describe('stop daemon', () => {
    it('should stop mqttDB', function (done) {
        this.timeout(20000);
        proc.on('close', () => {
            done();
        });
        setTimeout(() => {
            proc.kill('SIGTERM');
        }, 2000);
    });
});

describe('restart daemon', () => {
    it('mqttDB should start without error', function (done)  {
        this.timeout(20000);
        procSubscribe(/mqttdb [0-9.]+ starting/, data => {
            done();
        });
        startDb();
    });
    it('should load the previous database', function (done) {
        this.timeout(20000);
        procSubscribe(/database loaded/, data => {
            done();
        });
    });
    it('should publish 2 documents', function (done) {
        this.timeout(20000);
        procSubscribe(/published 2 objects/, data => {
            done();
        });
    });
});


describe('stop daemon', () => {
    it('should stop mqttDB', function (done) {
        this.timeout(20000);
        proc.on('close', () => {
            done();
        });
        setTimeout(() => {
            proc.kill('SIGTERM');
        }, 2000);
    });
});
