
# WebFeatureService

This is a simple [WFS](http://en.wikipedia.org/wiki/Web_Feature_Service)
client for JavaScript.

## Usage

```js
const WFS = require('./index');
const service = new WFS({
    url: 'http://.../wfs',
    auth: {
        username: 'myuser',
        password: 'secret'
    }
});
```


Standard WFS operations:

Each takes an `options` object, which is passed directly to the WFS service. Standard options are listed here for convenience.

* `service.getCapabilities()`
* `service.describeFeatureType()`
   `typeName` (required): layer name to describe
* `service.getFeature()`
  * `typeName` (required): layer name to retrieve features for
  * `maxFeatures`: maximum number of features to return.
  * `propertyName`: string or array of properties to include. if geometry not included, you get no geom.
  * `bbox:` [miny, minx, maxy, maxx]
  * `cql_filter`: filter as described [here](http://docs.geoserver.org/latest/en/user/tutorials/cql/cql_tutorial.html).
  * `outputFormat`: string (CSV|application/json|text/javascript/shape-zip|GML2|GML3) ([Docs](http://docs.geoserver.org/latest/en/user/services/wfs/outputformats.html)). If CSV, CSV requested and automatically parsed, returned as object

Additional convenience wrappers:

* `service.getColumns()`
* `service.getColumnNames()`
* `service.getGeometryColumn()`
* `service.getNonGeometryColumns()`
* `service.getFeatureProperties()`

## Example Usage

```js
const WFS = require('./index');
const service = new WFS({
    url: 'https://maps-public.geo.nyu.edu/geoserver/sdr/wfs'
});

service.getCapabilities().then(caps => {
    console.log(caps.FeatureTypeList[0].FeatureType.length + ' feature types.');
});

service.getFeature({
  typeName: 'sdr:nyu_2451_34564',
  maxFeatures: 15,
  // Can't use bbox with cql_filter
  // bbox: [40.88, -74, 41, -73.6],

  propertyName: ['name', 'type'],
  cql_filter:"type='Cemetery' AND borough='Queens'"
}).then(results => {
  if (results.features) {
    console.log('Found ' + results.features.length + ' cemeteries in Queens');
    results.features.forEach(function(feature) {
      console.log(`${feature.properties.name} (feature id: ${feature.id})`);
      // console.log(feature);
    });
  }
}).catch(e => {
    console.error(e);
});
```

## License(s)

### MIT

Copyright (c) 2018 Steve Bennett <me@stevebennett.me>, based on earlier version by Damon Oehlman <damon.oehlman@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
