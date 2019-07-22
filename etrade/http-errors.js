const moment = require('moment-timezone'),
    _ = require('underscore'),
    mailer = require('mailer');

const IGNORED_ERRORS = ['ESOCKETTIMEDOUT'];

var HttpError = function(error) {
    this.error = error;
    this.date = moment();
};

var errorList = [];

function sendEmail(subject, content) {
    mailer.send({
        host: 'smtp.gmail.com',
        port: 465,
        ssl: true,
        authentication : 'login',
        username: 'raibelbotta@gmail.com',
        password: 'zeqrjlbguvmzdrtt',
        to: 'raibelbotta@gmail.com',
        from: 'raibelbotta@gmail.com',
        body: content,
        subject: subject
    }, function(error, result){
        if (error) throw error;
    });
}

function addError(error) {
    errorList.push(new HttpError(error));

    if (errorList.length > 100) {
        errorList.splice(0, errorList.length - 100);
    }
}

function canExecuteRequest() {
    var lastErrors = errorList.slice(errorList.length - 5);

    if (lastErrors.length < 5) {
        return true;
    }

    lastErrors.reverse();

    if ((errorList.length > 0) && (-1 !== IGNORED_ERRORS.indexOf(errorList[errorList.length - 1].error.errno))) {
        return true;
    }

    if (errorList.length < 2) {
        return true;
    }

    if (errorList[errorList.length - 1].error.errno == errorList[errorList.length - 2].error.errno
        && errorList[errorList.length - 1].date.isSameOrAfter(moment().subtract(10, 'second'))) {
        return false;
    }

    return true;
}

exports.addError = addError;
exports.canExecuteRequest = canExecuteRequest;