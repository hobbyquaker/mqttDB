/* eslint-disable no-case-declarations */

const EventEmitter = require('events').EventEmitter;
const oe = require('obj-ease');

class Api extends EventEmitter {
    constructor(config) {
        super();
        config = config || {};
        this.db = {};
        this.name = config.name || 'meta';
        this.backend = config.backend || 'file';

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
            this.incRev(id, rev);
            this.emit('update', id, this.db[id]);
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
                    this.incRev(id, rev);
                    this.emit('update', id, this.db[id]);
                    return true;
                }
                this.setRev(id, rev);
                return false;

            case 'set':
                rev = this.getRev(id);
                if (oe.setProp(this.db[id], payload.prop, payload.val)) {
                    this.incRev(id, rev);
                    this.emit('update', id, this.db[id]);
                    return true;
                }
                this.setRev(id, rev);
                return false;

            case 'setIfUndefined':
                if (typeof oe.getProp(this.db[id], payload.prop) === 'undefined') {
                    rev = this.getRev(id);
                    oe.setProp(this.db[id], payload.prop, payload.val);
                    this.incRev(id, rev);
                    this.emit('update', id, this.db[id]);
                    return true;
                }
                return false;

            case 'del':
                rev = this.getRev(id);
                if (oe.delProp(this.db[id], payload.prop)) {
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
        const rev = this.getRev(id);
        if (!this.db[id]) {
            this.db[id] = {};
        }
        const change = oe.extend(this.db[id], payload);
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
}

module.exports = Api;
