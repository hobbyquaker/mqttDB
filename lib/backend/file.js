module.exports = function (core) {
    const pjson = require('persist-json')('mqtt-meta');
    const timeout = 250;

    let timerDb;
    let timerViews;
    let timerQueries;

    let countDb = 0;
    let countViews = 0;
    let countQueries = 0;

    pjson.load(core.name + '.db', (err, data) => {
        if (err) {
            core.log.warn(err.message);
        } else {
            core.log.info('database loaded');
        }
        core.rev = (data && data.rev) || 0;
        core.db = (data && data.db) || {};

        pjson.load(core.name + '.views', (err, data) => {
            if (err) {
                core.log.warn(err.message);
            } else {
                core.log.info('views loaded');
            }
            core.views = (data && data.views) || {};

            pjson.load(core.name + '.queries', (err, data) => {
                if (err) {
                    core.log.warn(err.message);
                } else {
                    core.log.info('queries loaded');
                }
                core.queries = (data && data.queries) || {};
                core.emit('ready');
            });
        });
    });

    function updateDb() {
        if (timerDb && (countDb < 10)) {
            clearTimeout(timerDb);
            countDb += 1;
            timerDb = setTimeout(() => {
                timerDb = null;
                pjson.save(core.name + '.db', {rev: core.rev, db: core.db}, () => {});
            }, timeout);
        } else if (timerDb) {
            clearTimeout(timerDb);
            timerDb = null;
            countDb = 0;
            pjson.save(core.name + '.db', {rev: core.rev, db: core.db}, () => {});
        } else {
            timerDb = setTimeout(() => {
                timerDb = null;
                pjson.save(core.name + '.db', {rev: core.rev, db: core.db}, () => {});
            }, timeout);
        }
    }

    function updateViews() {
        if (timerViews && (countViews < 10)) {
            clearTimeout(timerViews);
            countViews += 1;
            timerViews = setTimeout(() => {
                timerViews = null;
                pjson.save(core.name + '.views', {views: core.views}, () => {});
            }, timeout);
        } else if (timerViews) {
            clearTimeout(timerViews);
            timerViews = null;
            countViews = 0;
            pjson.save(core.name + '.views', {views: core.views}, () => {});
        } else {
            timerViews = setTimeout(() => {
                timerViews = null;
                pjson.save(core.name + '.views', {views: core.views}, () => {});
            }, timeout);
        }
    }

    function updateQueries() {
        if (timerQueries && (countQueries < 10)) {
            clearTimeout(timerQueries);
            countQueries += 1;
            timerQueries = setTimeout(() => {
                timerQueries = null;
                pjson.save(core.name + '.queries', {queries: core.queries}, () => {});
            }, timeout);
        } else if (timerQueries) {
            clearTimeout(timerQueries);
            timerQueries = null;
            countQueries = 0;
            pjson.save(core.name + '.queries', {queries: core.queries}, () => {});
        } else {
            timerQueries = setTimeout(() => {
                timerQueries = null;
                pjson.save(core.name + '.queries', {queries: core.queries}, () => {});
            }, timeout);
        }
    }

    core.on('update', () => {
        core.rev += 1;
        updateDb();
    });

    core.on('view', () => {
        updateViews();
    });

    core.on('query', () => {
        updateQueries();
    });
};
