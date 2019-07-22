const moment = require('moment-timezone'),
    cron = require('cron').CronJob;

var logs = [];

var HttpLog = function(index) {
    this.index = index;
    this.start = {
        text: 'start',
        date: moment()
    };
}

HttpLog.prototype.setEnd = function(text, wasError) {
    this.end = {
        date: moment(),
        text: text,
        wasError: typeof wasError !== 'undefined' ? wasError : false
    }
}

new cron('0 0 * * * *', function() {
    logs = logs.filter(function(log) {
        return typeof log.end === 'undefined';
    });
}, null, true);

exports.createLog = function() {
    var index = logs.length,
        log = new HttpLog(index);

    logs.push(log);

    return log;
}