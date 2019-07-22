var config = require('./../config');

const API_CONSUMER_KEY = 'api_consumer_key',
    API_CONSUMER_SECRET = 'api_consumer_secret',
    API_ACCESS_TOKEN_KEY = 'api_access_token',
    API_ACCESS_TOKEN_SECRET = 'api_access_token_secret';

function getConsumerData(callback) {
    config.getConfig(API_CONSUMER_KEY, function(key) {
        config.getConfig(API_CONSUMER_SECRET, function(secret) {
            callback({key: key, secret: secret});
        });
    })
}

function getTokenData(callback) {
    var key, secret;

    config.getConfig(API_ACCESS_TOKEN_KEY, function(value) {
        key = value;

        config.getConfig(API_ACCESS_TOKEN_SECRET, function(value) {
            secret = value;

            callback({key: key, secret: secret});
        });
    });
}

exports.getConsumerData = getConsumerData;
exports.getTokenData = getTokenData;