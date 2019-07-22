const _ = require('underscore');

function rtrim(baseString, char) {
    while (baseString.endsWith(char) && baseString.length > 0) {
        baseString = baseString.substring(0, baseString.length - 1);
    }

    return baseString;
}

function buildQueryString(queryParamsObj) {
    let url = '';

    _.each(queryParamsObj, function(v, k) {
        if (v) {
            url += `${k}=${encodeURI(v)}&`;
        }
    });

    url = rtrim(url, '&');

    return url;
}

function buildFullURL(baseURL, RESTParams, queryParamsObj) {
    let url = rtrim(baseURL, '/');

    if (typeof RESTParams === 'undefined') {
        RESTParams = ''
    }

    RESTParams = RESTParams.trim();
    RESTParams = rtrim(RESTParams, '/');

    if (RESTParams) {
        url += `/${RESTParams}`;
    }

    url += '.json';

    if (typeof queryParamsObj !== 'undefined') {
        url += `?${buildQueryString(queryParamsObj)}`;
    }

    return url;
}

exports.buildFullURL = buildFullURL;