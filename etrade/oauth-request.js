const oauthUtils = require('./oauth-utils'),
    _ = require('underscore'),
    moment = require('moment'),
    hasha = require('hasha');

function parseUrl(url) {
    return new URL(url);
}

function generateNonce() {
    var mt = moment().format('x'),
        mt_rand = Math.random();

    return hasha(`${mt}${mt_rand}`, {algorithm: 'md5'});
}

function generateTimestamp() {
    return moment().format('X');
}

function OAuthRequest(httpMethod, httpUrl, parameters) {
    parameters = typeof parameters !== 'undefined' ? parameters : {};
    let queryStr = parseUrl(httpUrl).search.replace(/^\?(.+)$/, '$1'),
        resultParameters = {};

    _.extend(resultParameters, oauthUtils.parseParameters(queryStr), parameters);

    this.parameters = resultParameters;
    this.httpMethod = httpMethod;
    this.httpUrl = httpUrl;
}

OAuthRequest.prototype.setParameter = function(name, value, allowDuplicates) {
    allowDuplicates = typeof allowDuplicates !== 'undefined' ? allowDuplicates : true;

    if (allowDuplicates && (typeof this.parameters[name] !== 'undefined')) {
        if (!_.isArray(this.parameters[name])) {
            this.parameters[name] = [this.parameters[name]];
        }
        this.parameters[name].push(value);
    } else {
        this.parameters[name] = value;
    }
};

OAuthRequest.prototype.toPostdata = function() {
    return oauthUtils.buildHttpQuery(this.parameters);
};

OAuthRequest.prototype.getNormalizedHttpUrl = function() {
    let url = new URL(this.httpUrl);

    let scheme = url.protocol ? url.protocol.substring(0, url.protocol.length - 1) : 'http',
        port = url.port ? url.port : (scheme == 'https' ? '443' : '80'),
        host = url.hostname ? url.hostname.toLowerCase() : '',
        path = url.pathname ? url.pathname : ''

    if ((scheme == 'https' && port != '443') || (scheme == 'http' && port != '80')) {
        host = `${host}:${port}`;
    }

    return `${scheme}://${host}${path}`;
};

OAuthRequest.prototype.getNormalizedHttpMethod = function() {
    return this.httpMethod.toUpperCase();
};

OAuthRequest.prototype.getSignableParameters = function() {
    return oauthUtils.buildHttpQuery(_.omit(this.parameters, 'oauth_signature'));
}

OAuthRequest.prototype.toUrl = function() {
    let postData = this.toPostdata(),
        out = getNormalizedHttpUrl();

    if (postData) {
        out += '?' + postData;
    }

    return out;
};

OAuthRequest.prototype.toHeader = function(realm) {
    var out,
        first = true;

    if (realm) {
        out = `OAuth realm="${oauthUtils.urlEncodeRFC3986(realm)}"`;
        first = false;
    } else {
        out = 'OAuth';
    }

    _.each(this.parameters, function(v, k) {
        if (k.substr(0, 5) != 'oauth') {
            return;
        }

        if (_.isArray(v)) {
            throw 'Arrays not supported in headers';
        }

        out += first ? ' ' : ',';
        out += `${oauthUtils.urlEncodeRFC3986(k)}="${oauthUtils.urlEncodeRFC3986(v)}"`;
        first = false;
    });

    return {'Authorization': out};
};

OAuthRequest.prototype.getSignatureBaseString = function() {
    let parts = [
        this.getNormalizedHttpMethod(),
        this.getNormalizedHttpUrl(),
        this.getSignableParameters()
    ];

    parts = oauthUtils.urlEncodeRFC3986(parts);

    return parts.join('&');
};

OAuthRequest.prototype.buildSignature = function(signatureMethod, consumer, token) {
    return signatureMethod.buildSignature(this, consumer, token);
};

OAuthRequest.prototype.signRequest = function(signatureMethod, consumer, token) {
    this.setParameter('oauth_signature_method', signatureMethod.getName(), false);

    let signature = this.buildSignature(signatureMethod, consumer, token);

    this.setParameter('oauth_signature', signature, false);
};

function fromConsumerAndToken(consumer, token, httpMethod, httpUrl, parameters) {
    parameters = typeof parameters !== 'undefined' ? parameters : {};

    var defaults = {
        'oauth_nonce': generateNonce(),
        'oauth_timestamp': generateTimestamp(),
        'oauth_consumer_key': consumer.key
    };

    if (token) {
        defaults['oauth_token'] = token.key;
    }

    _.extend(defaults, parameters);

    return new OAuthRequest(httpMethod, httpUrl, defaults);
}

exports.OAuthRequest = OAuthRequest;
exports.fromConsumerAndToken = fromConsumerAndToken;