const config = require('./etrade-config');

const OAuthClient = function(consumer, token) {
    this.consumer = consumer;
    this.token = token;
};

module.exports = function(callback) {
    config.getConsumerData(function(consumerData) {
        config.getTokenData(function(tokenData) {
            callback(new OAuthClient(consumerData, tokenData));
        });
    });
};