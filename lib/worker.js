const domain = require('domain'); // eslint-disable-line no-restricted-modules
const vm = require('vm');
const oe = require('obj-ease');
const mw = require('mqtt-wildcard');

const time = process.env.DEBUG ? console.time : () => {};
const timeEnd = process.env.DEBUG ? console.timeEnd : () => {};

class Views {
    constructor() {
        this.db = {};
        this.queries = {};
        this.views = {};
        this.viewsEnv = {};

        process.on('message', msg => {
            switch (msg.type) {
                case 'db':
                    this.db = msg.db;
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
                    this.updateViews();
                    break;

                case 'query':
                    if (msg.init) {
                        this.views[msg.id] = msg.init;
                    }
                    this.query(msg.id, msg.payload, Boolean(msg.init));
                    break;
                case 'view':
                    this.views[msg.id] = msg.payload;
                    break;
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

            if (!this.views[id]) {
                this.views[id] = {
                    _id: id,
                    _rev: -1
                };
            }

            let src = `
                _meta.map = function () {
                    ${map}
                };
                _meta.result = [];           
                Object.keys(_meta.db).forEach(id => {`;

            if (filter) {
                src += `
                    if (_meta.mw(id, ${JSON.stringify(filter)})) {
                        _meta.map.apply(_meta.db[id], [_meta.db[id]]);
                    }`;
            } else {
                src += `
                    _meta.map.apply(_meta.db[id], [_meta.db[id]]);`;
            }
            src += `
                });
            `;
            if (reduce) {
                src += `
                _meta.reduce = function (result) {
                    ${reduce}
                }
                _meta.result = _meta.reduce(_meta.result);
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

            if (!this.viewsEnv[id].context) {
                const sandbox = {
                    _meta: {
                        db: this.db,
                        mw,
                        result: []
                    },
                    emit: item => {
                        sandbox._meta.result.push(item);
                    }
                };
                time(process.pid + ' createContext ' + id);
                this.viewsEnv[id].context = vm.createContext(sandbox);
                timeEnd(process.pid + ' createContext ' + id);
            }

            if (this.viewsEnv[id].script) {
                this.execView(id);
            }
        }
    }

    execView(id) {
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
        });

        viewDomain.run(() => {
            setTimeout(() => {
                time(process.pid + ' runInContext ' + id);
                script.runInContext(context, {
                    filename: 'view-' + id,
                    timeout: this.scriptTimeout,
                    lineOffset: 2
                });
                timeEnd(process.pid + ' runInContext ' + id);
                timeEnd(process.pid + ' execView ' + id);

                const res = context._meta.result;
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
            }, 0);
        });
    }

    updateViews() {
        Object.keys(this.queries).forEach(id => {
            this.execView(id);
        });
    }
}

new Views(); // eslint-disable-line no-new
