const domain = require('domain'); // eslint-disable-line no-restricted-modules
const vm = require('vm');
const oe = require('obj-ease');
const mqttWildcard = require('mqtt-wildcard');

/* istanbul ignore next */
const time = process.env.DEBUG ? console.time : () => {};
/* istanbul ignore next */
const timeEnd = process.env.DEBUG ? console.timeEnd : () => {};

class Views {
    constructor() {
        this.db = {};
        this.queries = {};
        this.views = {};
        this.viewsEnv = {};
        this.updateQueue = [];

        /* istanbul ignore next */
        this.scriptTimeout = (typeof process.env.SCRIPT_TIMEOUT === 'undefined') ? 0 : process.env.SCRIPT_TIMEOUT;

        process.on('message', msg => {
            switch (msg.type) {
                case 'db':
                    this.db = msg.db;
                    this.rev = msg.rev;
                    Object.keys(this.db).forEach(id => {
                        Object.freeze(this.db[id]);
                    });
                    break;
                case 'update':
                    if (msg.payload === '') {
                        delete this.db[msg.id];
                    } else {
                        this.db[msg.id] = msg.payload;
                        Object.freeze(this.db[msg.id]);
                    }
                    this.rev = msg.rev;
                    this.updateViews();
                    break;

                case 'query':
                    if (msg.init) {
                        this.views[msg.id] = msg.init;
                    }
                    this.query(msg.id, msg.payload, Boolean(msg.init));
                    break;

                /* istanbul ignore next */
                default:
            }
        });
    }

    query(id, payload) {
        if (payload === '') {
            // Delete view
            delete this.queries[id];
            delete this.views[id];
            delete this.viewsEnv[id];
            process.send({type: 'view', id, payload: ''});
        } else {
            // Create/overwrite view
            this.queries[id] = payload;

            const map = payload.map;
            const reduce = payload.reduce;
            const filter = payload.filter;

            if (!this.viewsEnv[id]) {
                this.viewsEnv[id] = {};
            }
            this.viewsEnv[id].rev = -1;

            if (!this.views[id]) {
                this.views[id] = {
                    _id: id,
                    _rev: -1
                };
            }

            let src = `
                api.map = function () {
                    ${map}
                };
                api._result = [];           
                api.forEachDocument(id => {`;

            if (filter) {
                src += `
                    if (api.mqttWildcard(id, ${JSON.stringify(filter)})) {
                        api.map.apply(api.getDocument(id));
                    }`;
            } else {
                src += `
                    api.map.apply(api.getDocument(id));`;
            }
            src += `
                });
            `;
            if (reduce) {
                src += `
                api.reduce = function (result) {
                    ${reduce}
                }
                api._result = api.reduce(api._result);
                `;
            }
            delete this.viewsEnv[id].context;
            delete this.viewsEnv[id].script;
            delete this.views[id].serror;
            try {
                time(process.pid + ' create script ' + id);
                this.viewsEnv[id].script = new vm.Script(src, {
                    filename: 'view-' + id
                });
                timeEnd(process.pid + ' create script ' + id);
            } catch (err) {
                this.views[id].error = 'script creation: ' + err.message;
                delete this.views[id].result;
                delete this.views[id].length;
                delete this.viewsEnv[id].script;
                process.send({type: 'view', id, payload: this.views[id]});
            }

            /* istanbul ignore else */
            if (!this.viewsEnv[id].context) {
                time(process.pid + ' createContext ' + id);
                const Sandbox = {
                    /**
                     * @class api
                     */
                    api: {
                        /**
                         * @method api.forEachDocument
                         * @param {forEachDocumentCallback} callback
                         * @description executes a provided function once for each document. Do not use this function inside a map-script, that would result in O(n²) complexity and ruin view composition performance.
                         */
                        forEachDocument: callback => Object.keys(this.db).forEach(callback),
                        /**
                         * @callback forEachDocumentCallback
                         * @param {string} id the id of the current document
                         */

                        /**
                         * @method api.getDocument
                         * @param {string} id a document id
                         * @returns {object} the document
                         * @description get a document by id
                         */
                        getDocument: id => this.db[id],

                        /**
                         * @method api.getProp
                         * @param {object} document
                         * @param {string} property
                         * @returns {*} the properties value or undefined
                         * @description get a properties value
                         * @see {@link https://github.com/hobbyquaker/obj-ease#getprop|obj-ease documentation}
                         */
                        getProp: oe.getProp,

                        /**
                         * @method api.mqttWildcard
                         * @param {string} id
                         * @param {string} pattern
                         * @returns {array|null}
                         * @description match a string against a MQTT wildcard pattern
                         * @see {@link https://github.com/hobbyquaker/mqtt-wildcard#api|mqtt-wildcard documentation}
                         */
                        mqttWildcard,
                        _result: []
                    },
                    /**
                     * @method emit
                     * @param {*} item
                     * @description push an item to the result array
                     */
                    emit: item => Sandbox.api._result.push(item)
                };
                this.viewsEnv[id].context = vm.createContext(Sandbox);
                timeEnd(process.pid + ' createContext ' + id);
            }

            if (this.viewsEnv[id].script) {
                this.updateQueue.push(id);
                this.shiftQueue();
            }
        }
    }

    execView(id, callback) {
        time(process.pid + ' execView ' + id);
        const script = this.viewsEnv[id].script;
        time(process.pid + ' create domain ' + id);
        const viewDomain = domain.create();
        timeEnd(process.pid + ' create domain ' + id);
        const context = this.viewsEnv[id].context;

        viewDomain.on('error', err => {
            this.views[id].error = 'script execution: ' + err.message;
            delete this.views[id].result;
            delete this.views[id].length;
            process.send({type: 'view', id, payload: this.views[id]});
            callback();
        });

        viewDomain.run(() => {
            setImmediate(() => {
                const rev = this.rev;
                time(process.pid + ' runInContext ' + id);
                script.runInContext(context, {
                    filename: 'view-' + id,
                    timeout: this.scriptTimeout,
                    lineOffset: 2
                });
                timeEnd(process.pid + ' runInContext ' + id);
                timeEnd(process.pid + ' execView ' + id);

                this.viewsEnv[id].rev = rev;

                const res = context.api._result;
                /* istanbul ignore if */
                if (!this.views[id]) {
                    this.views[id] = {
                        _rev: -1
                    };
                }
                delete this.views[id].error;
                delete this.views[id].serror;
                if (!oe.equal(res, this.views[id].result)) {
                    this.views[id]._rev += 1;
                    this.views[id].result = res;
                    this.views[id].length = res.length;
                    process.send({type: 'view', id, payload: this.views[id]});
                }
                callback();
            });
        });
    }

    updateViews() {
        Object.keys(this.queries).forEach(id => {
            this.updateQueue.push(id);
        });
        setImmediate(() => {
            this.shiftQueue();
        });
    }

    shiftQueue() {
        if (this.viewRunning || this.updateQueue.length === 0) {
            return;
        }
        const id = this.updateQueue.shift();
        if (this.viewsEnv[id].rev === this.rev) {
            setImmediate(() => {
                this.shiftQueue();
            });
        } else {
            this.viewRunning = true;
            this.execView(id, () => {
                this.viewRunning = false;
                setImmediate(() => {
                    this.shiftQueue();
                });
            });
        }
    }
}

new Views(); // eslint-disable-line no-new
