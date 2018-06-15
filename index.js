/* jshint node: true, esnext:true */
'use strict';

const debug = require('debug')('wfs');
const request = require('request-promise');
const stripBom = require('strip-bom');

const xml2json = (xml) => new Promise((resolve, reject) =>
    require('xml2js').parseString(xml, {
        explicitRoot: false,
        explicitArray: false,
        mergeAttrs: true
    }, (err, res) => {
        if (err) { return reject(err); } else { return resolve(res); }
    })
);

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

    makeRequest(operation, options, allowXml) {
        var requestOpts = {
            url: this.url + '?',
            auth: this.auth,
            json: true,
            qs: this.getUrlParams(operation, options)
        };
        debug('making request to: ' + requestOpts.url);
        debug(JSON.stringify(requestOpts));
        return request.get(requestOpts).then(result => {
            if (typeof result === 'string' && result[0] === '<') {
                const j = xml2json(result);
                if (allowXml) {
                    return xml2json(result);
                } else {
                    return xml2json(result).then(j => { 
                        j = j['ows:ExceptionReport'] || j;
                        j = j['ows:Exception'] || j;
                        j = j[0] || j;
                        j = j['ows:ExceptionText'] || j;
                        j = j[0] || j;
                        throw j;
                    });
                }
            } else if (typeof result === 'object') {
                return result;
            } else {
                throw result;
            }
        });
    }
    /*
        Return capabilities of server, as JSON. For convenience, the root node is removed.
    */
    getCapabilities(options) {
        return this.makeRequest('GetCapabilities', options, true);
    }

    /*
        A convenience wrapper to get the list of feature types available.
        Returns an array of objects: [{
            Name
            Type
            Abstract
            ...
        },...]
    */
    getFeatureTypes(options) {
        return this.getCapabilities(options)
            .then(caps => caps.FeatureTypeList.FeatureType);
    }

    /*
        getFeature({
            typeName (required): layer name to retrieve features for
            maxFeatures: maximum number of features to return.
            propertyName: string or array of properties to include. if geometry not included, you get no geom.
            bbox: [miny, minx, maxy, maxx]
            cql_filter: filter as described here http://docs.geoserver.org/latest/en/user/tutorials/cql/cql_tutorial.html
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
