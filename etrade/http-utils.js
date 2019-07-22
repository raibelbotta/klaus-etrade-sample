const _ = require('underscore'),
    oauthRequest = require('./oauth-request'),
    OAuthToken = require('./oauth-token'),
    OAuthSignatureMethodHMACSHA1 = require('./signature-method/oauth-signature-method-hmacsha1'),
    request = require('request');

const REQUEST_FORMAT_XML = 'xml',
      REQUEST_FORMAT_JSON = 'json';

class HttpError extends Error {
    constructor(message, request) {
        super(message);

        this.request = request;
    }
}

const httpUtil = function(consumer, url, headers, method, requestFormat, verifyPeer) {
    this.consumer = consumer;
    this.requestUrl = url;
    this.headers = typeof headers !== 'undefined' ? headers : false;
    this.method = typeof method !== 'undefined' ? method : 'GET';
    this.requestFormat = typeof requestFormat !== 'undefined' ? requestFormat : REQUEST_FORMAT_XML;
    this.useSSL = typeof verifyPeer !== 'undefined' ? verifyPeer : true;
};

httpUtil.prototype.getRequestObject = function() {
    let tokenObj;

    if (this.consumer.token.key && this.consumer.token.secret) {
        tokenObj = new OAuthToken(this.consumer.token.key, this.consumer.token.secret);
    }

    let requestObject = oauthRequest.fromConsumerAndToken(this.consumer, tokenObj, this.method, this.requestUrl),
        signMethod = new OAuthSignatureMethodHMACSHA1();

    requestObject.signRequest(signMethod, this.consumer, tokenObj);

    return requestObject;
};

httpUtil.prototype.getSignedUrlAndHeaders = function() {
    let signedObj = this.getRequestObject();

    if (this.headers) {
        this.headers = {};
        if (REQUEST_FORMAT_JSON == this.requestFormat) {
            _.extend(this.headers, {'Content-Type': 'application/json'}, signedObj.toHeader());
        } else {
            _.extend(this.headers, {'Content-Type': 'application/xml'}, signedObj.toHeader());
        }
    } else {
        this.requestUrl = signedObj.toUrl();
    }
};

httpUtil.prototype.doHttpRequest = function() {
    let options = {
        method: this.method,
        url: this.requestUrl,
        timeout: 5000
    };

    if (this.headers) {
        options.headers = this.headers;
    }

    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                reject(new HttpError(error.message, options));

                return;
            }

            resolve(body);
        });
    });
};

httpUtil.prototype.getResponse = function() {
    return new Promise((resolve, reject) => {
        this.getSignedUrlAndHeaders();
        this.doHttpRequest()
            .then(resolve)
            .catch(reject);
    });
};

exports.httpUtil = httpUtil;