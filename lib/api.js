/* eslint-disable no-case-declarations */

const util = require('util');
const domain = require('domain');
const vm = require('vm');
const EventEmitter = require('events').EventEmitter;
const oe = require('obj-ease');
const mw = require('mqtt-wildcard');

class Api extends EventEmitter {
    constructor(config) {
        super();
        config = config || {};
        this.db = {};
        this.views = {};
        this.viewsEnv = {};
        this.name = config.name || 'meta';
        this.backend = config.backend || 'file';
        this.scriptTimeout = config.scriptTimeout || 10000;

        require('./backend/' + this.backend + '.js')(this);
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
        if (typeof payload !== 'object') {
            return false;
        }
        const rev = this.getRev(id);
        delete payload._rev;
        if (!oe.equal(this.db[id], payload)) {
            this.db[id] = payload;
            this.db[id]._id = id;
            this.incRev(id, rev);
            this.emit('update', id, this.db[id]);
            this.updateViews();
            return true;
        }
        this.setRev(id, rev);
        return false;
    }

    prop(id, payload) {
        let rev;
        switch (payload.method) {
            case 'extend':
                rev = this.getRev(id);
                const prop = oe.getProp(this.db[id], payload.prop);
                if (oe.extend(prop, payload.val)) {
                    oe.setProp(this.db[id], payload.prop, prop);
                    this.db[id]._id = id;
                    this.incRev(id, rev);
                    this.emit('update', id, this.db[id]);
                    this.updateViews();
                    return true;
                }
                this.setRev(id, rev);
                return false;

            case 'set':
                rev = this.getRev(id);
                if (oe.setProp(this.db[id], payload.prop, payload.val)) {
                    this.db[id]._id = id;
                    this.incRev(id, rev);
                    this.emit('update', id, this.db[id]);
                    this.updateViews();
                    return true;
                }
                this.setRev(id, rev);
                return false;

            case 'setIfUndefined':
                if (typeof oe.getProp(this.db[id], payload.prop) === 'undefined') {
                    rev = this.getRev(id);
                    oe.setProp(this.db[id], payload.prop, payload.val);
                    this.db[id]._id = id;
                    this.incRev(id, rev);
                    this.emit('update', id, this.db[id]);
                    this.updateViews();
                    return true;
                }
                return false;

            case 'del':
                rev = this.getRev(id);
                if (oe.delProp(this.db[id], payload.prop)) {
                    this.db[id]._id = id;
                    this.incRev(id, rev);
                    this.emit('update', id, this.db[id]);
                    this.updateViews();
                    return true;
                }
                this.setRev(id, rev);
                return false;

            default:
                console.log('unknown prop method', payload.method);
        }
    }

    extend(id, payload) {
        const rev = this.getRev(id);
        if (!this.db[id]) {
            this.db[id] = {};
        }
        const change = oe.extend(this.db[id], payload);
        this.db[id]._id = id;
        if (change) {
            this.incRev(id, rev);
            this.emit('update', id, this.db[id]);
            this.updateViews();
            return true;
        }
        this.setRev(id, rev);
        return false;
    }

    del(id) {
        delete this.db[id];
        this.emit('update', id, '');
        this.updateViews();
    }

    query(id, payload, force) {
        if (payload === '') {
            // delete view
            delete this.views[id];
            delete this.viewsEnv[id];
            this.emit('view', id, '');
        } else {
            // create/overwrite view
            const condition = payload.condition;
            const filter = payload.filter;

            if (!this.viewsEnv[id]) {
                this.viewsEnv[id] = {};
            }

            if (!this.views[id]) {
                this.views[id] = {
                    rev: -1,
                    condition,
                    filter
                };
            } else {
                this.views[id].condition = condition;
                this.views[id].filter = filter;
            }

            let src = `
                function fn() {
                    ${condition}
                }
                _meta.res = [];           
                Object.keys(_meta.db).forEach(id => {`;

            if (filter) {
                src += `
                    if (_meta.mw(id, ${JSON.stringify(filter)})) {
                        const item = fn.apply(_meta.db[id]);
                        if (item) {
                            _meta.res.push(item)
                        }
                    }`;
            } else {
                src += `
                    const item = fn.apply(_meta.db[id]);
                    if (item) {
                        _meta.res.push(item)
                    }`;
            }
            src += `
                });
            `;
            try {
                console.time('create script ' + id);
                this.viewsEnv[id].script = new vm.Script(src, {
                    filename: 'view-' + id
                });
                console.timeEnd('create script ' + id);
            } catch (err) {
                this.emit('view', id, {error: 'script creation: ' + err.message});
                this.viewsEnv[id].script = new vm.Script('', {
                    filename: 'view-' + id
                });
            }

            if (!this.viewsEnv[id].context) {
                console.time('clone db ' + id);
                const sandbox = {
                    global: {},
                    _meta: {
                        db: oe.clone(this.db),
                        rev: this.rev,
                        mw,
                        res: []
                    }
                };
                console.timeEnd('clone db ' + id);

                console.time('createContext ' + id);
                this.viewsEnv[id].context = vm.createContext(sandbox);
                console.timeEnd('createContext ' + id);
            }

            this.execView(id, (err, res) => {
                if (err) {
                    this.emit('view', id, {error: err, _id: id});
                } else {
                    if (!oe.equal(this.views[id].res, res)) {
                        this.views[id].rev += 1;
                        this.views[id].res = res;
                        this.emit('view', id, {
                            val: res,
                            length: res.length,
                            _rev: this.views[id].rev
                        });
                    } else if (force) {
                        this.emit('view', id, {
                            val: this.views[id].res,
                            length: this.views[id].res.length,
                            _rev: this.views[id].rev
                        });
                    }
                }
            });
        }
    }

    execView(id, callback) {
        console.time('execView ' + id);
        const script = this.viewsEnv[id].script;
        console.time('create domain ' + id);
        const viewDomain = domain.create();
        console.timeEnd('create domain ' + id);
        const context = this.viewsEnv[id].context;

        if (context._meta.rev !== this.rev) {
            console.time('clone db ' + id);
            context._meta.db = oe.clone(this.db);
            console.timeEnd('clone db ' + id);
            context._meta.rev = this.rev;
        }

        viewDomain.on('error', err => {
            callback('script execution: ' + err.message);
        });

        viewDomain.run(function ()  {
            setTimeout(function () {
                console.time('runInContext ' + id);
                script.runInContext(context, {
                    filename: 'view-' + id,
                    timeout: this.scriptTimeout,
                    lineOffset: 2
                });
                console.timeEnd('runInContext ' + id);
                console.timeEnd('execView ' + id);
                callback(null, oe.clone(context._meta.res));
            }, 0);
        });
    }

    updateViews(force) {
        Object.keys(this.views).forEach(id => {
            this.execView(id, (err, res) => {
                if (err) {
                    this.emit('view', id, {error: err, _rev: this.views[id].rev});
                } else if (force || !oe.equal(this.views[id].res, res)) {
                    this.views[id].res = res;
                    this.views[id].rev += 1;
                    this.emit('view', id, {val: res, length: res.length, _rev: this.views[id].rev});
                }
            });
        });
    }
}

module.exports = Api;
