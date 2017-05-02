module.exports = function (api) {
    const pjson = require('persist-json')('mqtt-meta');
    const timeout = 250;
    let timer;
    let count = 0;

    pjson.load(api.name, (err, data) => {
        if (err) {
            api.emit('error', err);
        }
        api.rev = (data && data.rev) || 0;
        api.db = (data && data.db) || {};
        api.emit('ready');
    });

    api.on('update', () => {
        api.rev += 1;
        if (timer && (count < 10)) {
            clearTimeout(timer);
            count += 1;
            timer = setTimeout(() => {
                timer = null;
                pjson.save(api.name, {rev: api.rev, db: api.db});
            }, timeout);
        } else if (timer && (count >= 10)) {
            clearTimeout(timer);
            timer = null;
            count = 0;
            pjson.save(api.name, {rev: api.rev, db: api.db});
        } else {
            timer = setTimeout(() => {
                timer = null;
                pjson.save(api.name, {rev: api.rev, db: api.db});
            }, timeout);
        }
    });
};
