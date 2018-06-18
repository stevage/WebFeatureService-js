/* jshint node: true, esnext:true */
'use strict';

const debug = require('debug')('wfs');
const request = require('request-promise');
const stripBom = require('strip-bom');
const csvjson = require('csvjson');

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
    /*
        {
            url: URL of service, not including ? or anything after it
            auth: { username, password }, passed to requests
        }
    */
    constructor(params) {
        Object.assign(this, params);
    }

    getUrlParams(operation, options, allowXml) {
        return Object.assign({
            service: 'wfs',
            version: '1.1.0',
            request: operation
        }, !allowXml ? { outputFormat: 'JSON' } : {},
        options);
    }

    makeRequest(operation, options, allowXml) {
        var requestOpts = {
            url: this.url + '?',
            auth: this.auth,
            json: true,
            qs: this.getUrlParams(operation, options, allowXml),
            resolveWithFullResponse: true
        };
        debug('making request to: ' + requestOpts.url);
        debug(JSON.stringify(requestOpts));
        return request.get(requestOpts).then(response => {
            debug('Response from ' + response.request.href);
            let result = response.body;
            if (typeof result === 'string' && result[0] === '<') {
                const j = xml2json(result);
                if (allowXml) {
                    // wanted XML, got XML
                    return xml2json(result);
                } else {
                    // wanted JSON, got XML, it's probably an exception report.
                    return xml2json(result).then(j => { 
                        j = j['ows:ExceptionReport'] || j;
                        j = j['ows:Exception'] || j;
                        j = j['ows:ExceptionText'] || j;
                        throw j;
                    });
                }
            } else if (/csv/i.test(options.outputFormat)) {
                return csvjson.toObject(result);
            } else if (typeof result === 'object' || /csv/.test(options.outputFormat)) {
                // requested JSON and got a JSON, or requested CSV and got something that wasn't XML
                return result;
            } else {
                // (probably) requested JSON and didn't get it.
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
            outputFormat: string. if CSV, CSV requested and automatically parsed, returned as object
        })
    */
    getFeature(options) {
        if (!options.typeName) { throw 'typeName required'; }
        if (typeof options.propertyName === 'string') {
            options.propertyName = [options.propertyName];
        }
        // flatten arrays such as propertyName, bbox
        for (const k of Object.keys(options)) {
            if (Array.isArray(options[k])) {
                if (k === 'propertyName') {
                    // I thought wrapping in " helped, but no. See https://gis.stackexchange.com/questions/286403/how-to-request-wfs-propertyname-containing-parentheses                    
                    // options[k] = options[k].map(v => '"' + v + '"')
                    options[k] = options[k].join(',')

                    options[k] = '(' + options[k] + ')' // seems like a good idea.

                } else {
                    options[k] = options[k].join(',');
                }
            }
        }
        debug('getFeature options: ', options);
        return this.makeRequest('getFeature', options);
    }

    /* Returns array of property objects of features */
    getFeatureProperties(options) {
        return this.getFeature(options).then(featureCollection => featureCollection.features.map(f => f.properties));
    }

    /* WFS operation, gives lots of metadata about the feature type */
    describeFeatureType(options) {
        if (!options.typeName) { throw 'typeName required'; }
        return this.makeRequest('describeFeatureType', options, true);
    }

    /* Convenience wrapper: returns arrays of column information */
    getColumns(options) {
        return this.describeFeatureType(options).then(result => {
            return result['xsd:complexType']['xsd:complexContent']['xsd:extension']['xsd:sequence']['xsd:element'];
        });
    }

    /* Convenience wrapper: returns array of names of columns */
    getColumnNames(options) {
        return this.getColumns(options).then(columns => columns.map(c => c.name));
    }

    /* Returns string, name of geometry columns */
    getGeometryColumnName(options) {
        return this.getColumns(options)
            .then(columns => columns
                    .filter(c => c.type.match(/^gml:/))
                    .map(c => c.name)[0]
                );
    }
    /* Returns array of strings, names of non-geometry columns. */
    getNonGeometryColumnNames   (options) {
        return this.getColumns(options)
            .then(columns => columns
                    .filter(c => !c.type.match(/^gml:/))
                    .map(c => c.name)
                );
    }

};

module.exports = webFeatureService;
