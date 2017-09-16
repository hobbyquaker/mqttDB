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

    setRev(id, rev)  {
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
        const rev = this.getRev(id);
        if (!oe.equal(this.db[id], payload)) {
            this.db[id] = payload;
            this.incRev(id, rev);
            this.emit('update', id, this.db[id]);
            return true;
        }
        this.setRev(id, rev);
        return false;
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

    del (id) {
        delete this.db[id];
        this.emit('update', id, '');
    }
}

module.exports = Api;
