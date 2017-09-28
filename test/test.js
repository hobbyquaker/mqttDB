/* global describe, it, should */

const debug = false;

require('should');

const path = require('path');
const cp = require('child_process');
const streamSplitter = require('stream-splitter');
const request = require('request');
const io = require('socket.io-client');

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
        if (debug) console.log('db', data.toString());
        matchSubscriptions(data.toString());
    });
    procPipeErr.on('token', data => {
        if (debug) console.log('db', data.toString());
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
                if (debug) console.log('mqtt unsubscribe', sub.topic);
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
    if (debug) console.log('mqtt subscribe', topic);
    mqtt.subscribe(topic);
}

function mqttSubscribeOnceRetain(topic, callback) {
    mqttSubscriptions.push({topic, callback, once: true, retain: true});
    if (debug) console.log('mqtt subscribe', topic);
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
    it('should log error on malformed payload', function (done) {
        this.timeout(20000);
        procSubscribe(/malformed payload/, () => {
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/set/test5', '}{');
        }, 500);
    });
    it('should log error on malformed topic', function (done) {
        this.timeout(20000);
        procSubscribe(/malformed topic/, () => {
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/set/', '{}');
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

describe('view test2 script creation error', () => {
    it('should publish an error', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test2', payload => {
            should.deepEqual({ _id: 'test2', _rev: -1, error: 'script creation: Unexpected identifier'}, payload);
            done();
        });
        mqtt.publish(dbId + '/query/test2', JSON.stringify({map: 'ERROR (this.type === "muh") emit(this._id)'}));
    });
});

describe('view test3 script execution error', () => {
    it('should publish an error', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test3', payload => {
            should.deepEqual({ _id: 'test3', _rev: -1, error: 'script execution: Cannot read property \'type\' of undefined'}, payload);
            done();
        });
        mqtt.publish(dbId + '/query/test3', JSON.stringify({map: 'if (this.doesNotExist.type === "muh") emit(this._id)'}));
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

describe('webserver', () => {
    it('should response with http 200 on /', function (done) {
        this.timeout(20000);
        request('http://127.0.0.1:8092/', (err, res, body) => {
            if (res.statusCode) {
                done();
            }
        });
    });
});

describe('socket.io', () => {
    it('should connect', function (done) {
        const client = io.connect('http://127.0.0.1:8092');
        client.on('connect', () => {
            done();
            client.disconnect();
        });
    });
    it('should receive objectIds on connect', function (done) {
        const client = io.connect('http://127.0.0.1:8092');
        client.on('objectIds', (data) => {
            client.disconnect();
            data.should.deepEqual(['doc1', 'doc2']);
            done();
        });
    });
    it('should receive viewIds on connect', function (done) {
        const client = io.connect('http://127.0.0.1:8092');
        client.on('viewIds', (data) => {
            client.disconnect();
            data.should.deepEqual(['test2', 'test3']);
            done();
        });
    });
    it('should get an object', function (done) {
        const client = io.connect('http://127.0.0.1:8092');
        client.emit('getObject', 'doc1', data => {
            client.disconnect();
            data.should.deepEqual({type: 'muh', _id: 'doc1', _rev: 0});
            done();
        });
    });
    it('should create a view', function (done) {
        this.timeout(20000);
        const client = io.connect('http://127.0.0.1:8092');
        mqttSubscribeOnce(dbId + '/view/test4', data => {
            data.should.deepEqual({_id: 'test4', _rev: 0, result: [ 'doc1', 'doc2' ], length: 2});
            done();
        });
        client.emit('query', 'test4', {map: 'emit(this._id)'}, () => {
            client.disconnect();
        });
    });
    it('should get a view', function (done) {
        this.timeout(20000);
        const client = io.connect('http://127.0.0.1:8092');
        setTimeout(() => {
            client.emit('getView', 'test4', data => {
                data.should.deepEqual({
                    id: 'test4',
                    query: {map: 'emit(this._id)'},
                    view: {_id: 'test4', _rev: 0, result: [ 'doc1', 'doc2' ], length: 2}
                });
                client.disconnect();
                done();
            });
        }, 2000);
    });
    it('should create a document', function (done) {
        this.timeout(20000);
        const client = io.connect('http://127.0.0.1:8092');
        mqttSubscribeOnce(dbId + '/doc/doc3', data => {
            data.should.deepEqual({_id: 'doc3', _rev: 0, foo: 'bar'});
            done();
        });
        client.emit('set', 'doc3', {foo: 'bar'}, () => {
            client.disconnect();
        });
    });
    it('should respond with error on revision conflict', function (done) {
        this.timeout(20000);
        const client = io.connect('http://127.0.0.1:8092');
        client.emit('set', 'doc3', {foo: 'bar', _rev: -1}, (data) => {
            data.should.equal('rev mismatch 0');
            client.disconnect();
            done();
        });
    });
    it('should delete a document', function (done) {
        this.timeout(20000);
        const client = io.connect('http://127.0.0.1:8092');
        mqttSubscribeOnce(dbId + '/doc/doc3', data => {
            data.should.equal('');
            done();
        });
        client.emit('del', 'doc3', () => {
            client.disconnect();
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
