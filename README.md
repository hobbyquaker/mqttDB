# mqtt-meta

[![NPM version](https://badge.fury.io/js/mqtt-meta.svg)](http://badge.fury.io/js/mqtt-meta)
[![Dependency Status](https://img.shields.io/gemnasium/hobbyquaker/mqtt-meta.svg?maxAge=2592000)](https://gemnasium.com/github.com/hobbyquaker/mqtt-meta)
[![Build Status](https://travis-ci.org/hobbyquaker/mqtt-meta.svg?branch=master)](https://travis-ci.org/hobbyquaker/mqtt-meta)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License][mit-badge]][mit-url]

> JSON Store with MQTT Interface


## Install

`npm install -g mqtt-meta`


## Usage

### Web UI

mqtt-meta offers a simple ui, you can reach it on `http://<hostname>:8089` with username/password `admin`/`admin` (can
be changed via command line params, see `mqtt-meta --help`).

### Ids

The id of an object can be any string, slashes are allowed - only the mqtt wildcards `#` and `+` may not occur in the 
id.


### Payload

Payload is always a JSON encoded string.


### Topics on which mqtt-meta publishes

#### `meta/connected`

Publishes `1` when mqtt-meta is started and publishes `2` when all objects are published.

#### `meta/rev`

Publishes the database revision.

#### `meta/status/<id>`

All objects are published retained on the status topic.


### Topics subscribed by mqtt-meta

#### `meta/set/<id>`

Set (create, overwrite) an object. 

#### `meta/extend/<id>`

Extend an object.

#### `meta/del/<id>`

Delete an object.

#### `meta/prop/<id>`

Set/extend/delete object properties. Examples Payloads:

* `{"method":"set", "prop": "name", "val": "new name!"}`
* `{"method":"del", "prop": "name"}`

You can use dot-Notation for `prop` to access nested properties.


## License

MIT (c) 2017 [Sebastian Raff](https://github.com/hobbyquaker)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE
