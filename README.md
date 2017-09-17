# mqtt-meta

[![NPM version](https://badge.fury.io/js/mqtt-meta.svg)](http://badge.fury.io/js/mqtt-meta)
[![Dependency Status](https://img.shields.io/gemnasium/hobbyquaker/mqtt-meta.svg?maxAge=2592000)](https://gemnasium.com/github.com/hobbyquaker/mqtt-meta)
[![Build Status](https://travis-ci.org/hobbyquaker/mqtt-meta.svg?branch=master)](https://travis-ci.org/hobbyquaker/mqtt-meta)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License][mit-badge]][mit-url]

> JSON Store with MQTT Interface

**Work in Progress**: unfinished, probably full of bugs.


## Install

`$ npm install -g mqtt-meta`


## Usage

### Web UI

mqtt-meta offers a simple ui, you can reach it on `http://<hostname>:8089` with username/password `admin`/`admin` (can
be changed via command line params, see `mqtt-meta --help`).

### Ids

The id of an object can be any string, slashes are allowed - only the mqtt wildcards `#` and `+` may not occur in the 
id. As the intended use of mqtt-meta is to manage meta-data that belongs to mqtt topics I suggest to just use the topic
that is described by the object as id.

### Create/overwrite an object

To create or overwrite an Object with the id `hue/light/livingroom` you have to publish on the topic 
`meta/set/hue/light/livingroom`. The payload has to be a JSON object, e.g. 
`{"type": "light", "name": "hue light livingroom"}`. As soon as the object was created the object itself is published 
retained on the topic `meta/status/hue/lights/livingroom`.

### Deletion of objects

To delete the object from the previous example just publish on `meta/del/hue/lights/livingroom`. Payload is irrelevant.

### Query/Views

You can create views that publish an array of object ids that match some criteria. 

Example: Publish the payload `{"condition": "if (this.type === 'light') return this._id"}` on the topic `meta/query/lights` to create 
a view "lights" that contains all objects that have a type attribute with the value `light`. The condition can be any
valid Javascript code, it just has to return something that evaluates to true to determine that an object is
member of the view.
As soon as the view is created mqtt-meta publishes on `meta/view/lights`, with the above example this would result in
following payload:
```json
{
  "val": ["hue/light/livingroom"],
  "length": 1,
  "_rev": 0
}
```
If any change on the database happens all views are re-calculated, so if you add another object with `"type": "light"`
mqtt-meta will immediately publish the updated view with the new member.

Besides the possibility to select objects with a condition you can also use the attribute filter to match object ids
to an mqtt-style wildcard. Example payload: 
`{"filter": "hue/lights/#", "condition": "if (this.type === 'light') return this._id"}`

### Internal properties

These properties are set on all objects by mqtt-meta, they can't be changed or deleted.

#### _rev

An objects revision. Just a counter that gets incremented on every change of the object.

#### _id

The objects id.

### Topics on which mqtt-meta publishes

#### `meta/connected`

Publishes `1` when mqtt-meta is started and publishes `2` when all objects are published.

#### `meta/rev`

Publishes the database revision.

#### `meta/status/<id>`

All objects are published retained on these topics.

#### `meta/view/<id>`

All views are published retained on these topics.

### Topics subscribed by mqtt-meta

#### `meta/set/<id>`

Set (create, overwrite) an object. 

#### `meta/extend/<id>`

Extend an object (overwrite only given properties).

#### `meta/del/<id>`

Delete an object. Payload is irrelevant.

#### `meta/prop/<id>`

Set/extend/delete object properties. Examples Payloads:

* `{"method":"set", "prop": "name", "val": "new name!"}`
* `{"method":"del", "prop": "name"}`

You can use dot-Notation for `prop` to access nested properties.

#### `meta/query/<id>`

Create or overwrite a view. Use an empty string payload to delete a view.


## Disclaimer

I'm not a database expert nor do I think that mqtt-meta as of today scales very well. For my usecase it works with 
sufficient performance, your mileage may vary.


## License

MIT (c) 2017 [Sebastian Raff](https://github.com/hobbyquaker)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE
