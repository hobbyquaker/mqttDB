const EventEmitter = require('events').EventEmitter;
const util = require('util');
const oe = require('obj-ease');

const Api = function (config) {
    if (!(this instanceof Api)) {
        return new Api(config);
    }

    this.db = {};
    this.name = (config && config.name) || 'meta';

    require('./backend/file.js')(this);

    this.getRev = id => {
        if (this.db[id] && (typeof this.db[id]._rev !== 'undefined')) {
            const rev = this.db[id]._rev;
            delete this.db[id]._rev;
            return rev;
        }
        return -1;
    };

    this.setRev = (id, rev) => {
        if (this.db[id]) {
            this.db[id]._rev = rev;
        }
    };

    this.incRev = (id, rev) => {
        if (this.db[id]) {
            this.db[id]._rev = rev + 1;
        }
    };
};

Api.prototype.set = function (id, payload) {
    const rev = this.getRev(id);
    if (!oe.equal(this.db[id], payload)) {
        this.db[id] = payload;
        this.incRev(id, rev);
        this.emit('update', id, this.db[id]);
        return true;
    }
    this.setRev(id, rev);
    return false;
};

Api.prototype.extend = function (id, payload) {
    const rev = this.getRev(id);
    if (!this.db[id]) {
        this.db[id] = {};
    }
    if (oe.extend(this.db[id], payload)) {
        this.incRev(id, rev);
        this.emit('update', id, this.db[id]);
        return true;
    }
    this.setRev(id, rev);
    return false;
};

Api.prototype.del = function (id) {
    delete this.db[id];
    this.emit('update', id, '');
};

util.inherits(Api, EventEmitter);

module.exports = Api;
