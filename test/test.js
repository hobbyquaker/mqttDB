/* global describe, it, should */

const debug = false;

require('should');

const path = require('path');
const cp = require('child_process');
const streamSplitter = require('stream-splitter');
const request = require('request');
const io = require('socket.io-client');

if (process.platform === 'darwin') {
    cp.spawn('/usr/local/bin/brew', ['services', 'start', 'mosquitto']);
}

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
    it('connect to the mqtt broker', function (done) {
        this.timeout(20000);
        procSubscribe(/mqtt connected/, data => {
            done();
        });
    });
    it('spawn workers', function (done) {
        this.timeout(20000);
        procSubscribe(/all workers ready/, data => {
            done();
        });
    });
    it('complete init', function (done) {
        this.timeout(20000);
        procSubscribe(/init complete/, data => {
            done();
        });
    });
    it('subscribe to set', function (done) {
        procSubscribe(/mqtt subscribe db[0-9a-f]+\/set\/#/, () => {
            done();
        });
    });
    it('subscribe to extend', function (done) {
        procSubscribe(/mqtt subscribe db[0-9a-f]+\/extend\/#/, () => {
            done();
        });
    });
    it('subscribe to prop', function (done) {
        procSubscribe(/mqtt subscribe db[0-9a-f]+\/prop\/#/, () => {
            done();
        });
    });
    it('subscribe to query', function (done) {
        procSubscribe(/mqtt subscribe db[0-9a-f]+\/query\/#/, () => {
            done();
        });
    });
});

describe('document test1', () => {
    it('create a document', function (done) {
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
    it('get a document', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            should.deepEqual({type: 'test', _id: 'test1', _rev: 0}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/get/doc/test1');
        }, 500);
    });
    it('get a non-existing document', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test0', payload => {
            payload.should.equal('');
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/get/doc/test0');
        }, 500);
    });
    it('log error on unknown get type', function (done) {
        this.timeout(20000);
        procSubscribe(/unknown get type/, () => {
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/get/foo/bar');
        }, 500);
    });
    it('log error on malformed payload', function (done) {
        this.timeout(20000);
        procSubscribe(/malformed payload/, () => {
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/set/test5', '}{');
        }, 500);
    });
    it('log error on malformed topic', function (done) {
        this.timeout(20000);
        procSubscribe(/malformed topic/, () => {
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/set/', '{}');
        }, 500);
    });
    it('extend a document', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            should.deepEqual({type: 'test', _id: 'test1', _rev: 1, muh: 'kuh'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/extend/test1', JSON.stringify({muh: 'kuh'}));
        }, 500);
    });
    it('extend a non-existing document', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/doc6', payload => {
            should.deepEqual({_id: 'doc6', _rev: 0, muh: 'kuh'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/extend/doc6', JSON.stringify({muh: 'kuh'}));
        }, 500);
    });
    it('do nothing on extending existing document', function (done) {
        mqttSubscribeOnceRetain(dbId + '/doc/doc6', payload => {
            should.deepEqual({_id: 'doc6', _rev: 0, muh: 'kuh'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/extend/doc6', JSON.stringify({muh: 'kuh'}));
        }, 500);
    });
    it('do nothing on setting existing document', function (done) {
        mqttSubscribeOnceRetain(dbId + '/doc/doc6', payload => {
            should.deepEqual({_id: 'doc6', _rev: 0, muh: 'kuh'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/set/doc6', JSON.stringify({muh: 'kuh'}));
        }, 500);
    });
    it('set a property', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            should.deepEqual({type: 'test', _id: 'test1', _rev: 2, muh: 'kuh', bla: 'blubb'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/prop/test1', JSON.stringify({method: 'set', prop: 'bla', val: 'blubb'}));
        }, 500);
    });
    it('do nothing on setting existing property', function (done) {
        mqttSubscribeOnceRetain(dbId + '/doc/doc6', payload => {
            should.deepEqual({_id: 'doc6', _rev: 0, muh: 'kuh'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/prop/doc6', JSON.stringify({method: 'set', prop: 'muh', val: 'kuh'}));
        }, 500);
    });
    it('overwrite a property', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            should.deepEqual({type: 'test', _id: 'test1', _rev: 3, muh: 'kuh', bla: 'bla'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/prop/test1', JSON.stringify({method: 'set', prop: 'bla', val: 'bla'}));
        }, 500);
    });
    it('create a property', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            should.deepEqual({type: 'test', _id: 'test1', _rev: 4, muh: 'kuh', bla: 'bla', foo: 'bar'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/prop/test1', JSON.stringify({method: 'create', prop: 'foo', val: 'bar'}));
        }, 500);
    });

    it('should not overwrite a property', function (done) {
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

    it('should delete a property', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            should.deepEqual({type: 'test', _id: 'test1', _rev: 5, muh: 'kuh', bla: 'bla'}, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/prop/test1', JSON.stringify({method: 'del', prop: 'foo'}));
        }, 500);
    });
    it('delete a document', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/test1', payload => {
            payload.should.equal('');
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/set/test1', '');
        }, 500);
    });
    it('delete a document', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/doc/doc6', payload => {
            payload.should.equal('');
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/set/doc6', '');
        }, 500);
    });
});

describe('view test1', () => {
    it('create a view', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test1', payload => {
            should.deepEqual({ _id: 'test1', _rev: 0, result: [], length: 0 }, payload);
            done();
        });
        mqtt.publish(dbId + '/query/test1', JSON.stringify({filter: '#', map: 'if (this.type === "muh") emit(this._id)', reduce: 'return result'}));
    });
    it('get a view', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test1', payload => {
            should.deepEqual({ _id: 'test1', _rev: 0, result: [], length: 0 }, payload);
            done();
        });
        mqtt.publish(dbId + '/get/view/test1');
    });
    it('get a non-existing view', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test0', payload => {
            payload.should.equal('');
            done();
        });
        mqtt.publish(dbId + '/get/view/test0');
    });
    it('publish the new view after adding a document', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test1', payload => {
            should.deepEqual({ _id: 'test1', _rev: 1, result: [ 'doc1' ], length: 1 }, payload);
            done();
        });
        setTimeout(() => {
            mqtt.publish(dbId + '/set/doc1', JSON.stringify({type: 'muh'}));
        }, 2000);
    });
    it('not change the view after adding a document not matching the query', function (done) {
        this.timeout(20000);
        mqtt.publish(dbId + '/set/doc2', JSON.stringify({type: 'foo'}));
        setTimeout(() => {
            mqttSubscribeOnceRetain(dbId + '/view/test1', payload => {
                should.deepEqual({ _id: 'test1', _rev: 1, result: [ 'doc1' ], length: 1 }, payload);
                done();
            });
        }, 2000);
    });
    it('publish the new view after altering the query', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test1', payload => {
            should.deepEqual({ _id: 'test1', _rev: 2, result: [ 'doc2' ], length: 1 }, payload);
            done();
        });
        mqtt.publish(dbId + '/query/test1', JSON.stringify({filter: '#', map: 'if (this.type === "foo") emit(this._id)', reduce: 'return result'}));
    });
    it('queue view execution', function (done) {
        this.timeout(20000);
        for (let i = 3; i < 50; i++) {
            mqtt.publish(dbId + '/set/doc' + i, JSON.stringify({type: 'foo'}));
        }
        setTimeout(() => {
            mqttSubscribeOnceRetain(dbId + '/view/test1', payload => {
                delete payload._rev;
                payload.should.deepEqual({ 
                    _id: 'test1',
                    result: [
                        'doc2', 'doc3', 'doc4', 'doc5', 'doc6', 'doc7', 'doc8', 'doc9', 'doc10', 'doc11', 'doc12',
                        'doc13', 'doc14', 'doc15', 'doc16', 'doc17', 'doc18', 'doc19', 'doc20', 'doc21', 'doc22',
                        'doc23', 'doc24', 'doc25', 'doc26', 'doc27', 'doc28', 'doc29', 'doc30', 'doc31', 'doc32',
                        'doc33', 'doc34', 'doc35', 'doc36', 'doc37', 'doc38', 'doc39', 'doc40', 'doc41', 'doc42',
                        'doc43', 'doc44', 'doc45', 'doc46', 'doc47', 'doc48', 'doc49'
                    ],
                    length: 48
                });

                for (let i = 3; i < 50; i++) {
                    mqtt.publish(dbId + '/set/doc' + i, '');
                }
                setTimeout(() => {
                    done();
                }, 5000);
            });
        }, 5000);

    });
    it('delete the view', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test1', payload => {
            payload.should.equal('');
            done();
        });
        mqtt.publish(dbId + '/query/test1', '');
    });
});

describe('view test2 script creation error', () => {
    it('publish an error', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test2', payload => {
            should.deepEqual({ _id: 'test2', _rev: -1, error: 'script creation: Unexpected identifier'}, payload);
            done();
        });
        mqtt.publish(dbId + '/query/test2', JSON.stringify({map: 'ERROR (this.type === "muh") emit(this._id)'}));
    });
});

describe('view test3 script execution error', () => {
    it('publish an error', function (done) {
        this.timeout(20000);
        mqttSubscribeOnce(dbId + '/view/test3', payload => {
            should.deepEqual({ _id: 'test3', _rev: -1, error: 'script execution: Cannot read property \'type\' of undefined'}, payload);
            done();
        });
        mqtt.publish(dbId + '/query/test3', JSON.stringify({map: 'if (this.doesNotExist.type === "muh") emit(this._id)'}));
    });
});

describe('stop daemon', () => {
    it('stop mqttDB', function (done) {
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
    it('load the previous database', function (done) {
        this.timeout(20000);
        procSubscribe(/database loaded/, data => {
            done();
        });
    });
    it('publish 2 documents', function (done) {
        this.timeout(20000);
        procSubscribe(/published 2 docs/, data => {
            done();
        });
    });
});

describe('webserver', () => {
    it('response with http 200 on /', function (done) {
        this.timeout(20000);
        request('http://127.0.0.1:8092/', (err, res, body) => {
            if (res.statusCode) {
                done();
            }
        });
    });
});

describe('socket.io', () => {
    it('connect', function (done) {
        const client = io.connect('http://127.0.0.1:8092');
        client.on('connect', () => {
            done();
            client.disconnect();
        });
    });
    it('receive objectIds on connect', function (done) {
        const client = io.connect('http://127.0.0.1:8092');
        client.on('objectIds', (data) => {
            client.disconnect();
            data.should.deepEqual(['doc1', 'doc2']);
            done();
        });
    });
    it('receive viewIds on connect', function (done) {
        const client = io.connect('http://127.0.0.1:8092');
        client.on('viewIds', (data) => {
            client.disconnect();
            data.should.deepEqual(['test2', 'test3']);
            done();
        });
    });
    it('get an object', function (done) {
        const client = io.connect('http://127.0.0.1:8092');
        client.emit('getObject', 'doc1', data => {
            client.disconnect();
            data.should.deepEqual({type: 'muh', _id: 'doc1', _rev: 0});
            done();
        });
    });
    it('create a view', function (done) {
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
    it('get a view', function (done) {
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
    it('create a document', function (done) {
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
    it('respond with error on revision conflict', function (done) {
        this.timeout(20000);
        const client = io.connect('http://127.0.0.1:8092');
        client.emit('set', 'doc3', {foo: 'bar', _rev: -1}, (data) => {
            data.should.equal('rev mismatch 0');
            client.disconnect();
            done();
        });
    });
    it('delete a document', function (done) {
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

describe('mqtt connection', () => {
    it('log disconnection from broker', function (done) {
        this.timeout(20000);
        procSubscribe(/mqtt close/, () => {
            done();
        });
        if (process.platform === 'darwin') {
            cp.spawn('/usr/local/bin/brew', ['services', 'stop', 'mosquitto']);
        } else {
            cp.spawn('/usr/bin/sudo', ['/etc/init.d/mosquitto', 'stop']);
        }
    });

    it('try to reconnect to the broker', function (done) {
        this.timeout(30000);
        procSubscribe(/mqtt reconnect/, () => {
            done();
        });
    });

    it('log reconnection to broker', function (done) {
        this.timeout(20000);
        procSubscribe(/mqtt connected/, () => {
            done();
        });
        if (process.platform === 'darwin') {
            cp.spawn('/usr/local/bin/brew', ['services', 'start', 'mosquitto']);
        } else {
            cp.spawn('/usr/bin/sudo', ['/etc/init.d/mosquitto', 'start']);
        }
    });
});



describe('stop daemon', () => {
    it('stop mqttDB', function (done) {
        this.timeout(20000);
        proc.on('close', () => {
            done();
        });
        setTimeout(() => {
            proc.kill('SIGTERM');
        }, 2000);
    });
});
