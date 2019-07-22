'use strict';

const mysql = require('mysql'),
    Market = require('./etrade/market'),
    _ = require('underscore'),
    cron = require('cron'),
    moment = require('moment'),
    numeral = require('numeral'),
    yaml = require('yaml');

const API_CONSUMER_KEY = 'api_consumer_key',
    API_CONSUMER_SECRET = 'api_consumer_secret',
    API_ACCESS_TOKEN_KEY = 'api_access_token',
    API_ACCESS_TOKEN_SECRET = 'api_access_token_secret';

const SECONDS_REQUESTING_API = 120;

let consumer, // only usable by getConsumer
    dbPool, // only usable by getDbPool
    getQuoteStatistics = [];

const Token = function(key, secret) {
    this.key = key;
    this.secret = secret;
}

const Consumer = function(consumerKey, consumerSecret, tokenKey, tokenSecret) {
    this.key = consumerKey,
    this.secret = consumerSecret;
    this.token = new Token(tokenKey, tokenSecret);
}

const getDbPool = () => new Promise(resolve => {
    if (dbPool) {
        resolve(dbPool);
    } else {
        dbPool = mysql.createPool({
            host: 'localhost',
            database: 'etrade',
            user: 'root',
            password: null
        });

        resolve(dbPool);
    }
});

const getPersistedValue = name => new Promise((resolve, reject) => {
    getDbPool()
        .then(pool => {
            let queryOptions = {
                sql: 'SELECT value FROM core_config WHERE path LIKE ? LIMIT 1',
                values: [name.toLowerCase()]
            };

            pool.query(queryOptions, (err, result) => {
                if (err) {
                    return reject(new Error(err.message));
                }
                if (result.length > 0) {
                    resolve(result[0].value);
                } else {
                    reject(new Error('%1 not found'.replace('%1', name)));
                }
            });
        });
});

const loadSymbols = () => new Promise((resolve, reject) => {
    let symbolsList = [];

    getDbPool()
        .then(pool => {
            let queryOptions = {
                sql: 'SELECT code FROM company LIMIT ?',
                values: 200
            };

            pool.getConnection((error, connection) => {
                if (error) {
                    return reject(error);
                }

                connection.query(queryOptions)
                    .on('result', row => {
                        if (/^[A-Z]+$/.test(row.code)) {
                            symbolsList.push(row.code);
                        }
                    })
                    .on('end', () => {
                        connection.release();

                        resolve(symbolsList);
                    })
                    .on('error', error => {
                        reject(error);
                    });
            })
        });
});

const getConsumer = () => new Promise((resolve, reject) => {
    if (!consumer) {
        // if you have static values, uncomment following lines
        //consumer = new Consumer('consumerKey', 'consumerSecret', 'accessTokenKey', 'accessTokenSecret');
        //return resolve(consumer);

        Promise.all([
            getPersistedValue(API_CONSUMER_KEY),
            getPersistedValue(API_CONSUMER_SECRET),
            getPersistedValue(API_ACCESS_TOKEN_KEY),
            getPersistedValue(API_ACCESS_TOKEN_SECRET)
        ]).then(values => {
            consumer = new Consumer(values[0], values[1], values[2], values[3]);
            resolve(consumer);
        }).catch(error => {
            reject(new Error('Can not obtain consumer. Reason: [%s]'.replace('%s', error.message)));
        });
    } else {
        return resolve(consumer);
    }
});

const getMarket = () => new Promise((resolve, reject) => {
    getConsumer()
        .then(consumer => resolve(new Market(consumer)))
        .catch(error => {
            reject(new Error('Can not obtain Market. Reason: [%s]'.replace('%s', error.message)));
        });
});

const processQuote = quote => new Promise(resolve => {
    // make "things" with quote

    resolve();
});

const requestMarket = symbols => new Promise((resolve, reject) => {
    getMarket()
        .then(market => {
            let parameters = {
                detailFlag: 'all',
                symbolList: symbols
            };

            if (symbols.length > 25) {
                parameters = _.extend(parameters, {overrideSymbolCount: true});
            }

            let callStat = {
                startedAt: moment(),
                endedAt: null,
                resultState: '',
                request: null
            };

            getQuoteStatistics.push(callStat);

            market
                .getQuote(parameters)
                .then(quoteResponse => {
                    _.extend(callStat, {resultState: 'SUCCESS'});
                    processQuote(quoteResponse);
                    resolve();
                })
                .catch(error => {
                    _.extend(callStat, {resultState: 'ERROR', request: error.request});
                    //reject(error);
                })
                .finally(() => {
                    callStat = _.extend(callStat, {endedAt: moment()});
                });
        })
        .catch(reject);
});

const writeOutGetQuoteStatistics = () => new Promise(resolve => {
    if (!!getQuoteStatistics.length) {
        let successRows = getQuoteStatistics.filter(row => row.resultState == 'SUCCESS'),
            failedRequests = getQuoteStatistics.filter(row => typeof row.resultState == 'undefined' || row.resultState != 'SUCCESS'),
            allDelayedTime = successRows.reduce((acc, stat) => acc + stat.endedAt.diff(stat.startedAt, 'seconds', true), 0),
            averageTime = allDelayedTime / successRows.length,
            plainText = '';

        successRows.sort((first, last) => {
            let firstDiff = first.endedAt.diff(first.startedAt, 'seconds', true),
                lastDiff = last.endedAt.diff(last.startedAt, 'seconds', true);

            if (firstDiff < lastDiff) {
                return -1;
            } else if (firstDiff > lastDiff) {
                return 1;
            }

            return 0;
        });

        plainText += "Number of requests: " + getQuoteStatistics.length + "\n";
        plainText += "Number of successful requests: " + successRows.length + "\n";
        plainText += "Number of failed requests (usually 'timed out' or 'no response'): " + (getQuoteStatistics.length - successRows.length) + "\n";
        plainText += 'Average time: ' + numeral(averageTime).format('0.00') + "s\n";
        plainText += 'Longest time: ' + numeral(successRows[successRows.length - 1].endedAt.diff(successRows[successRows.length - 1].startedAt, 'seconds', true)).format('0.00') +
            's at ' + moment.tz(successRows[successRows.length - 1].endedAt, 'America/New_York').format('HH:mm:ss.SSS') + "\n";
        plainText += 'Shortest time: ' + numeral(successRows[0].endedAt.diff(successRows[0].startedAt, 'seconds', true)).format('0.00') +
            's at ' + moment.tz(successRows[0].endedAt, 'America/New_York').format('HH:mm:ss.SSS') + "\n";
        plainText += "\n\n";
        plainText += "--------\n";
        plainText += 'Last 3 longest requests details:' + "\n";

        _.each(_.last(successRows, 3), element => {
            plainText += 'Requested at: ' + moment.tz(element.startedAt, 'America/New_York').format('HH:mm:ss.SSS') + '(America/New_York)' + "\n";
            plainText += 'Received at: ' + moment.tz(element.endedAt, 'America/New_York').format('HH:mm:ss.SSS') + '(America/New_York)' + "\n";
            plainText += "\n";
        });

        if (!!failedRequests.length) {
            plainText += "\n\n";
            plainText += "--------\n";
            plainText += "Some failed requests:\n";
            _.each(_.sample(failedRequests, 3), element => {
                plainText += 'Requested at: ' + moment.tz(element.startedAt, 'America/New_York').format('HH:mm:ss.SSS') + '(America/New_York)' + "\n";
                plainText += "Request content:\n";
                plainText += yaml.stringify(element.request) + "\n";
            });
        }

        console.log(plainText);

        return resolve();
    }

    getQuoteStatistics = [];
});

let counter = 0,
    job;

console.log('Started at: ', moment().format('H:mm:ss.SSS'));

loadSymbols()
    .then(symbolsList => {
        let job = new cron.CronJob('* * * * * *', () => {
            let i;

            for (i = 0; i < 4; i++) {
                requestMarket(symbolsList.slice(i * 50, i * 50 + 50))
                    .catch(error => {
                        console.log(error);
                        process.exit(1);
                    });
            }

            counter++;

            if (counter == SECONDS_REQUESTING_API + 1) {
                job.stop();
                console.log('End at: ', moment().format('H:mm:ss.SSS'));
                writeOutGetQuoteStatistics()
                    .then(() => {
                        process.exit(0);
                    });
            }
        }, null, true);
    });
