const _ = require('underscore'),
    querystring = require('querystring');

function urlEncodeRFC3986(input) {
    let result;

    if (_.isArray(input)) {
        result = _.map(input, function(element) {
            return urlEncodeRFC3986(element);
        });
    } else {
        result = querystring.escape(input).replace('%7E', '~').replace('+', ' ');
    }

    return result;
}

function urlDecodeRFC3986(value) {
    return decodeURI(value);
}

function parseParameters(input) {
    if (!input) {
        return {};
    }

    let pairs = input.split('&'),
        parsedParameters = {};

    _.each(pairs, function(v) {
        let split = v.split('='),
            parameter = urlDecodeRFC3986(split[0]),
            value = split.length === 2 ? urlDecodeRFC3986(split[1]) : '';

        if (typeof parsedParameters[parameter] !== 'undefined') {
            if (!Array.isArray(parsedParameters[parameter])) {
                parseParameters[parameter] = [parsedParameters[parameter]];
            }
            parsedParameters.push(value);
        } else {
            parsedParameters[parameter] = value;
        }
    });

    return parsedParameters;
}

function buildHttpQuery(params) {
    if (!_.keys(params).length) {
        return '';
    }

    let keys = urlEncodeRFC3986(_.keys(params)),
        values = urlEncodeRFC3986(_.values(params)),
        pairs = [];

    params = _.map(keys, function(key, index) {
        return [key, values[index]];
    });

    params = params.sort(function(first, second) {
        return first[0].localeCompare(second[0], 'en', {caseFirst: 'upper'});
    });

    _.each(params, function(value) {
        if (_.isArray(value[1])) {
            value[1] = value[1].sort();
            _.each(value[1], function(v) {
                pairs.push(`${value[0]}=${v}`);
            });
        } else {
            pairs.push(`${value[0]}=${value[1]}`);
        }
    });

    return pairs.join('&');
}

exports.parseParameters = parseParameters;
exports.urlEncodeRFC3986 = urlEncodeRFC3986;
exports.urlDecodeRFC3986 = urlDecodeRFC3986;
exports.buildHttpQuery = buildHttpQuery;