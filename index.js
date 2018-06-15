/* jshint node: true, esnext:true */
'use strict';

var debug = require('debug')('wfs');
var request = require('request-promise');
var stripBom = require('strip-bom');

let webFeatureService = class {
    constructor(params) {
        Object.assign(this, params);
    }

    getUrlParams(operation, options) {
        return Object.assign({
            service: 'wfs',
            version: '1.1.0',
            outputFormat: 'JSON',
            request: operation
        }, options);
    }

    makeRequest(operation, options, callback) {
        var requestOpts = {
            url: this.url + '?',
            auth: this.auth,
            json: true,
            qs: this.getUrlParams(operation, options)
        };
        debug('making request to: ' + requestOpts.url);
        debug(JSON.stringify(requestOpts));
        return request.get(requestOpts);
    }

    getCapabilities(options) {
        return this.makeRequest('GetCapabilities', options);
    }

    /*
        getFeature({
            typeName (required): layer name to retrieve features for
            maxFeatures: maximum number of features to return.
            propertyName: string or array of properties to include. if geometry not included, you get no geom.
        })
    */
    getFeature(options, callback) {
        if (!options.typeName) { throw 'typeName required'; }

        // flatten arrays such as propertyName, bbox
        for (const k of Object.keys(options)) {
            if (Array.isArray(options[k])) {
                options[k] = options[k].join(',');
            }
        }
        return this.makeRequest('getFeature', options, callback);
    }
};

module.exports = webFeatureService;
