const requestParams = require('./request-params'),
    httpUtils = require('./http-utils');

const URL_GET_QUOTE = 'https://api.etrade.com/v1/market/quote/';

const Market = function(client) {
    this.client = client;
};

Market.prototype.getMarketResponse = function(url, method) {
    if (arguments.length === 1) {
        method = 'GET';
    }

    let httpUtil = new httpUtils.httpUtil(this.client, url, true, method);

    return new Promise((resolve, reject) => {
        httpUtil.getResponse()
            .then(response => resolve(JSON.parse(response)))
            .catch(reject);
    });
};

Market.prototype.validateParamObject = function(paramObj) {

};

Market.prototype.getQuote = function(getQuoteParams) {
    this.validateParamObject(getQuoteParams);

    let symbolList = getQuoteParams.symbolList.join(',');
    delete getQuoteParams.symbolList;

    let resourceUrl = requestParams.buildFullURL(URL_GET_QUOTE, symbolList, getQuoteParams);

    return new Promise((resolve, reject) => {
        this.getMarketResponse(resourceUrl)
            .then(resolve)
            .catch(reject);
    });
};

module.exports = Market;