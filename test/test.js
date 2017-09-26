/* global subscribe, it */

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
});




describe('stop daemon', () => {
    it('should stop mqttDB', function (done) {
        proc.on('close', () => {
            done();
        });
        proc.kill('SIGTERM');
    });
});