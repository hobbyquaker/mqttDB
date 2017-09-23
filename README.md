# mqtt-meta

[![NPM version](https://badge.fury.io/js/mqtt-meta.svg)](http://badge.fury.io/js/mqtt-meta)
[![Dependency Status](https://img.shields.io/gemnasium/hobbyquaker/mqtt-meta.svg?maxAge=2592000)](https://gemnasium.com/github.com/hobbyquaker/mqtt-meta)
[![Build Status](https://travis-ci.org/hobbyquaker/mqtt-meta.svg?branch=master)](https://travis-ci.org/hobbyquaker/mqtt-meta)
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

`$ npm install -g mqtt-meta`


## Usage

### Command Line Parameters

```
Usage: mqtt-meta [options]

Options:
  -v, --verbosity      possible values: "error", "warn", "info", "debug"
                                                               [default: "info"]
  -n, --name           instance name. used as mqtt client id and as prefix for
                       connected topic                         [default: "meta"]
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

To run _mqtt-meta_ in background and start it on system boot I suggest to use the process manager 
[PM2](https://github.com/Unitech/pm2).


### Web UI

_mqtt-meta_ offers a simple ui, you can reach it on `http://<hostname>:8092`.


### Ids

The id of a document can be any string, slashes are allowed - only the mqtt wildcards `#` and `+` may not occur in the 
id. As the intended use of _mqtt-meta_ is to manage metadata that belongs to MQTT topics I suggest to just use the topic
that is described by the document as id.


### Create/overwrite an object

To create or overwrite an Object with the id `hue/light/livingroom` you have to publish on the topic 
`meta/set/hue/light/livingroom`. The payload has to be a JSON object, e.g. 
`{"type": "light", "name": "hue light livingroom"}`. As soon as the document was created the document itself is 
published retained on the topic `meta/status/hue/lights/livingroom`.


### Deletion of objects

To delete the object from the previous example just publish on `meta/del/hue/lights/livingroom`. Payload is irrelevant.


### Views

You can create views that publish an array of objects that match certain criteria by publishing a `map` function, an 
optional `reduce` function and an optional `filter` to the `meta/query/<view-id>` topic. The map and reduce functions
can be any valid  Javascript code, if you want to add something to the view you just have to return it. In the map 
function `this` refers to a document, the function is then applied to all documents to compose the view.

This is loosely inspired by CouchDB and MapReduce, but this is _not_ a _"real"_ MapReduce implementation, the map 
function is just called for every object, the reduce function can then work on the result array of the map function.

Example: Publish the payload `{"map": "if (this.type === 'light') emit(this._id)"}` on the topic 
`meta/query/lights` to create a view "lights" that contains the ids of all objects that have a `type` property with the 
value `light`. 
As soon as the view is created _mqtt-meta_ publishes on `meta/view/lights`, with the above example this would result in
following payload:
```json
{
  "result": ["hue/light/livingroom"],
  "length": 1,
  "_rev": 0
}
```
If any change on the database happens all views are re-composed, so if you add another object with `"type": "light"`
_mqtt-meta_ will immediately re-compose all views and then publish the updated views with the new member. 

Besides the possibility to select objects with a map script you can also use the property `filter` to match documents
ids to an mqtt-style wildcard. Example payload: 
`{"filter": "hue/lights/#", "map": "if (this.type === 'color light') return this._id"}`

The views are composed in separate worker processes, _mqtt-meta_ will spawn as many workers as CPU cores are available.
The map scripts are executed in a minimal sandbox, so you don't have access to Node.js globals like e.g. `console` 
or `require`. The documents in the workers are frozen, so no change on the database contents is possible by the map and
reduce scripts.

**See the [Wiki](https://github.com/hobbyquaker/mqtt-meta/wiki/Views)** for more examples on creating views with the 
Web UI.


### Internal properties

These properties are set on all objects by _mqtt-meta_, they can't be changed or deleted.

#### `_id`

The objects id.

#### `_rev`

An objects revision. Just a counter that gets incremented on every change of the object.


### Topics on which _mqtt-meta_ publishes

#### `meta/connected`

Publishes `1` when _mqtt-meta_ is started and publishes `2` when all objects are published.

#### `meta/rev`

Publishes the database revision number.

#### `meta/status/<id>`

All documents are published retained on these topics.

#### `meta/view/<id>`

All views are published retained on these topics.

### Topics subscribed by _mqtt-meta_

#### `meta/set/<id>`

Create or overwrite a document.

#### `meta/extend/<id>`

Extend a document (overwrite only given properties of the document).

#### `meta/del/<id>`

Delete a document. Payload is irrelevant.

#### `meta/prop/<id>`

Set/create/delete document properties. Examples Payloads:

* `{"method":"set", "prop": "name", "val": "new name!"}`
* `{"method":"create", "prop": "name", "val": "new name!"}`
* `{"method":"del", "prop": "name"}`

You can use dot-Notation for `prop` to access nested properties.

In contrast to the `set` method `create` won't overwrite existing properties.

#### `meta/query/<id>`

Create, overwrite or delete a view. Use an empty string payload to delete a view.


## Contributing

Pull Requests Welcome! 😀


## Disclaimer

I'm not a database expert nor do I think that _mqtt-meta_ as of today scales very well. For my usecase it works with 
sufficient performance, your mileage may vary. 


## License

MIT (c) 2017 [Sebastian Raff](https://github.com/hobbyquaker)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE
