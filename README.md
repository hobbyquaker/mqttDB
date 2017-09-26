# mqttDB

[![NPM version](https://badge.fury.io/js/mqttdb.svg)](http://badge.fury.io/js/mqttdb)
[![Dependency Status](https://img.shields.io/gemnasium/hobbyquaker/mqttDB.svg?maxAge=2592000)](https://gemnasium.com/github.com/hobbyquaker/mqttDB)
[![Build Status](https://travis-ci.org/hobbyquaker/mqttDB.svg?branch=master)](https://travis-ci.org/hobbyquaker/mqttDB)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License][mit-badge]][mit-url]

> This is a NoSQL Database, to be precise: a JSON Document Store with MQTT interface, CouchDB/MapReduce inspired Views,
implemented in Node.js. (Yeah, Buzzword Bingo! 🤠)

It's intended to be used as a database for storing metadata for systems that use MQTT as message bus, I'm using it in 
conjunction with [mqtt-smarthome](https://github.com/mqtt-smarthome/mqtt-smarthome), but I think it could be useful in
other MQTT based environments also.

You can create/modify/delete documents by publishing JSON payload to MQTT and receive document changes by simply 
subscribing to certain topics. You can create views by defining map and reduce functions in javascript and filter 
documents with MQTT wildcards.


## Install

`$ npm install -g mqttdb`


## Usage

### Command Line Parameters

```
Usage: mqttdb [options]

Options:
  -v, --verbosity      possible values: "error", "warn", "info", "debug"
                                                               [default: "info"]
  -n, --name           instance name. used as mqtt client id and as prefix for
                       connected topic                           [default: "db"]
  -u, --url            mqtt broker url.            [default: "mqtt://127.0.0.1"]
  -p, --web-port       web server port                           [default: 8092]
  -i, --web-interface  web server interface                 [default: "0.0.0.0"]
  -w, --web-disable    diable web server
  -h, --help           Show help                                       [boolean]
  --version            Show version number                             [boolean]
```

You can also connect to the MQTT Broker via Websocket and use TLS, also username ans password is supported for the
`--url` parameter. E.g `mqtts://user:password@192.168.2.200:1884` for a MQTT over TLS connection. For Websockets use
`ws://` respectively `wss://` as protocol.

To run _mqttDB_ in background and start it on system boot I suggest to use the process manager 
[PM2](https://github.com/Unitech/pm2).


### Web UI

_mqttDB_ offers a simple ui, you can reach it on `http://<hostname>:8092`.


### Ids

The id of a document can be any string, slashes are allowed - only the mqtt wildcards `#` and `+` may not occur in the 
id. As the intended use of _mqttDB_ is to manage metadata that belongs to MQTT topics I suggest to just use the topic
that is described by the document as id.


### Create/overwrite a document

To create or overwrite an Object with the id `hue/light/livingroom` you have to publish on the topic 
`db/set/hue/light/livingroom`. The payload has to be a JSON object, e.g. 
`{"type": "light", "name": "hue light livingroom"}`. As soon as the document was created the document itself is 
published retained on the topic `db/doc/hue/lights/livingroom`.


### Deletion of documents

To delete the document from the previous example just publish an empty string payload on `db/set/hue/lights/livingroom`. 


### Views

You can create _views_ that publish an array of objects that match certain criteria by publishing a _map_ function, an 
optional _reduce_ function and an optional _filter_ to the `db/query/<view-id>` topic. The map and reduce functions
can be any valid Javascript code, if you want to add something to the view you just have to emit it. In the map 
function `this` refers to the document, the function is then applied to all documents to compose the view. After the
_map_ function completed the optional _reduce_ function is called and can work on the result.

This is loosely inspired by CouchDB and MapReduce, but this is _not_ a _"real"_ MapReduce implementation.

Example: Publish the payload `{"map": "if (this.type === 'light') emit(this._id)"}` on the topic 
`db/query/lights` to create a view "lights" that contains the ids of all objects that have a `type` property with the 
value `light`. 
As soon as the view is created _mqttDB_ publishes on `db/view/lights`, with the above example this would result in
following payload:
```json
{
  "result": ["hue/light/livingroom"],
  "length": 1,
  "_rev": 0
}
```
If any change on the database happens all views are re-composed, so if you add another document with `"type": "light"`
_mqttDB_ will immediately re-compose all views and then publish the updated views with the new member. 

Besides the possibility to select documents with a map script you can also use the property `filter` to match documents
ids to an mqtt-style wildcard. Example payload: 
`{"filter": "hue/lights/#", "map": "if (this.type === 'color light') return this._id"}`

The views are composed in separate worker processes, _mqttDB_ will spawn as many workers as CPU cores are available.
The map and reduce scripts are executed in a minimal sandbox, so you don't have access to Node.js globals like e.g. 
`console` or `require`. The documents in the workers are frozen, so no change on the database contents is possible by 
the map and reduce scripts.


**See the [Wiki](https://github.com/hobbyquaker/mqttDB/wiki/Views) for more view examples**


### Internal properties

These properties are set on all documents by _mqttDB_, they can't be changed or deleted.

#### `_id`

A documents id.

#### `_rev`

A documents revision. Just a counter that gets incremented on every change of the document.


### Topics on which _mqttDB_ publishes

#### `db/connected`

Publishes `1` when _mqttDB_ is started and publishes `2` when all documents are published.

#### `db/rev`

Publishes the database revision number.

#### `db/doc/<id>`

All documents are published retained on these topics.

#### `db/view/<id>`

All views are published retained on these topics.

### Topics subscribed by _mqttDB_

#### `db/set/<id>`

Create, overwrite or delete a document. Payload has to be a JSON object, for deletion just publish an empty string.

#### `db/extend/<id>`

Extend a document (overwrite only given properties of the document).

#### `db/prop/<id>`

Set/create/delete document properties. Examples Payloads:

* `{"method":"set", "prop": "name", "val": "new name!"}`
* `{"method":"create", "prop": "name", "val": "new name!"}`
* `{"method":"del", "prop": "name"}`

You can use dot-Notation for `prop` to access nested properties.

In contrast to the `set` method `create` won't overwrite existing properties.

#### `db/query/<id>`

Create, overwrite or delete a view. Use an empty string payload to delete a view.


## Contributing

Pull Requests Welcome! 😀


## Disclaimer

I'm not a database expert nor do I think that _mqttDB_ as of today scales very well. _mqttDB_ handles memory quite
inefficient, the whole database is kept in memory in the core and all the worker processes. For my use case - with a few
thousand documents and a couple of dozen views - it works with sufficient performance, your mileage may vary. 


## License

MIT (c) 2017 [Sebastian Raff](https://github.com/hobbyquaker)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE
