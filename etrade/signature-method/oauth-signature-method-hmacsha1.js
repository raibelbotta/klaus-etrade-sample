const oauthUtils = require('../oauth-utils'),
      crypto = require('cryptojs').Crypto;

function base64Encode(value) {
    return crypto.util.bytesToBase64(value);
}

function OAuthSignatureMethodHMACSHA1() {
    this.name = 'HMAC-SHA1';
}

OAuthSignatureMethodHMACSHA1.prototype.getName = function() {
    return this.name;
}

OAuthSignatureMethodHMACSHA1.prototype.buildSignature = function(request, consumer, token) {
    var baseString = request.getSignatureBaseString();

    request.baseString = baseString;

    var keyParts = [
        consumer.secret,
        token ? token.secret : ''
    ];

    keyParts = oauthUtils.urlEncodeRFC3986(keyParts);
    var key = keyParts.join('&');

    var signature = base64Encode(crypto.HMAC(crypto.SHA1, baseString, key, {asBytes: true}));

    return signature;
}

module.exports = OAuthSignatureMethodHMACSHA1;