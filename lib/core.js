/* eslint-disable no-case-declarations, no-restricted-modules */

const os = require('os');
const cluster = require('cluster');
const EventEmitter = require('events').EventEmitter;
const oe = require('obj-ease');

let time;
let timeEnd;

class Core extends EventEmitter {
    constructor(config, log) {
        super();
        /* istanbul ignore next */
        config = config || {};
        this.log = log;
        this.db = {};
        this.queries = {};
        this.views = {};
        this.viewsEnv = {};
        /* istanbul ignore next */
        this.name = config.name || 'db';
        /* istanbul ignore next */
        this.backend = config.backend || 'file';
        /* istanbul ignore next */
        this.scriptTimeout = config.scriptTimeout || 10000;

        /* istanbul ignore else */
        if (config.verbosity === 'debug') {
            time = console.time;
            timeEnd = console.timeEnd;
        } else {
            time = () => {};
            timeEnd = () => {};
        }

        require('./backend/' + this.backend + '.js')(this);

        this.workers = [];

        /* istanbul ignore next */
        this.numWorkers = config.workers || os.cpus().length;

        cluster.setupMaster({
            exec: 'lib/worker.js',
            args: [],
            silent: false
        });

        cluster.on('online', worker => {
            this.workers.push(worker);
            log.info('worker ' + worker.process.pid + ' is online');
            worker.on('message', msg => {
                switch (msg.type) {
                    case 'view':
                        if (msg.payload === '') {
                            delete this.views[msg.id];
                        } else {
                            this.views[msg.id] = msg.payload;
                        }
                        this.emit('view', msg.id, msg.payload);
                        break;

                    /* istanbul ignore next */
                    default:
                }
            });
            if (this.workers.length === this.numWorkers) {
                log.info('all workers ready');
                startInit();
            }
        });

        const env = {};

        /* istanbul ignore else */
        if (config.verbosity === 'debug') {
            env.DEBUG = '1';
        }
        for (let i = 0; i < this.numWorkers; i++) {
            cluster.fork(env);
        }

        this.on('update', (id, payload) => {
            this.workers.forEach(worker => {
                time('sending update to worker ' + worker.process.pid);
                worker.send({type: 'update', id, payload, rev: this.rev});
                timeEnd('sending update to worker ' + worker.process.pid);
            });
        });

        this.on('ready', () => {
            startInit();
        });

        let eventCount = 0;
        function startInit() {
            eventCount += 1;
            if (eventCount === 2) {
                init();
            }
        }

        const that = this;

        function init() {
            that.workers.forEach(worker => {
                time('sending db to worker ' + worker.process.pid);
                worker.send({type: 'db', db: that.db, rev: that.rev});
                timeEnd('sending db to worker ' + worker.process.pid);
            });
            Object.keys(that.queries).forEach(id => {
                that.query(id, that.queries[id], true);
            });
            log.info('init complete');
        }
    }

    getRev(id) {
        if (this.db[id] && (typeof this.db[id]._rev !== 'undefined')) {
            const rev = this.db[id]._rev;
            delete this.db[id]._rev;
            return rev;
        }
        return -1;
    }

    setRev(id, rev) {
        if (this.db[id]) {
            this.db[id]._rev = rev;
        }
    }

    incRev(id, rev) {
        if (this.db[id]) {
            this.db[id]._rev = rev + 1;
        }
    }

    set(id, payload) {
        if (payload === '') {
            return this.del(id);
        }
        if (typeof payload !== 'object') {
            return false;
        }
        delete payload._rev;
        delete payload._id;
        const rev = this.getRev(id);
        if (this.db[id]) {
            delete this.db[id]._id;
        }
        if (!oe.equal(this.db[id], payload)) {
            this.db[id] = payload;
            this.db[id]._id = id;
            this.incRev(id, rev);
            this.emit('update', id, this.db[id]);
            return true;
        }
        this.db[id]._id = id;

        this.setRev(id, rev);
        return false;
    }

    prop(id, payload) {
        let rev;
        switch (payload.method) {
            case 'set':
                rev = this.getRev(id);
                if (oe.setProp(this.db[id], payload.prop, payload.val)) {
                    delete this.db[id]._id;
                    this.db[id]._id = id;
                    this.incRev(id, rev);
                    this.emit('update', id, this.db[id]);
                    return true;
                }
                this.setRev(id, rev);
                return false;

            case 'create':
                if (typeof oe.getProp(this.db[id], payload.prop) === 'undefined') {
                    rev = this.getRev(id);
                    oe.setProp(this.db[id], payload.prop, payload.val);
                    this.db[id]._id = id;
                    this.incRev(id, rev);
                    this.emit('update', id, this.db[id]);
                    return true;
                }
                return false;

            case 'del':
                rev = this.getRev(id);
                if (oe.delProp(this.db[id], payload.prop)) {
                    this.db[id]._id = id;
                    this.incRev(id, rev);
                    this.emit('update', id, this.db[id]);
                    return true;
                }
                this.setRev(id, rev);
                return false;

            default:
                console.log('unknown prop method', payload.method);
        }
    }

    extend(id, payload) {
        if (!payload || typeof payload !== 'object') {
            return false;
        }
        const rev = this.getRev(id);
        delete payload._id;
        delete payload._rev;
        if (this.db[id]) {
            delete this.db[id]._id;
        } else {
            this.db[id] = {};
        }
        const change = oe.extend(this.db[id], payload);
        this.db[id]._id = id;
        if (change) {
            this.incRev(id, rev);
            this.emit('update', id, this.db[id]);
            return true;
        }
        this.setRev(id, rev);
        return false;
    }

    del(id) {
        delete this.db[id];
        this.emit('update', id, '');
    }

    getWorker() {
        this.nextWorker = this.nextWorker || 0;
        const id = this.nextWorker;
        this.nextWorker += 1;
        if (this.nextWorker >= this.numWorkers) {
            this.nextWorker = 0;
        }
        return id;
    }

    query(id, payload, init) {
        if (!this.viewsEnv[id]) {
            this.viewsEnv[id] = {};
        }
        let workerId;
        if (!this.viewsEnv[id] || typeof this.viewsEnv[id].worker === 'undefined' || this.viewsEnv[id].worker >= this.numWorkers) {
            workerId = this.getWorker();
            this.viewsEnv[id].worker = workerId;
        } else {
            workerId = this.viewsEnv[id].worker;
        }

        if (payload === '') {
            delete this.queries[id];
            delete this.viewsEnv[id];
            delete this.views[id];
        } else {
            this.queries[id] = payload;
        }

        if (!init) {
            this.emit('query');
        }

        this.log.debug('sending query', id, 'to worker', workerId, payload);
        this.workers[workerId].send({type: 'query', id, payload, init: init ? this.views[id] : undefined});
    }

}

module.exports = Core;
