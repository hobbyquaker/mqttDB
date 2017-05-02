# mqtt-meta

[![NPM version](https://badge.fury.io/js/mqtt-meta.svg)](http://badge.fury.io/js/mqtt-meta)
[![Dependency Status](https://img.shields.io/gemnasium/hobbyquaker/mqtt-meta.svg?maxAge=2592000)](https://gemnasium.com/github.com/hobbyquaker/mqtt-meta)
[![Build Status](https://travis-ci.org/hobbyquaker/mqtt-meta.svg?branch=master)](https://travis-ci.org/hobbyquaker/mqtt-meta)
[![Coverage Status](https://coveralls.io/repos/github/hobbyquaker/mqtt-meta/badge.svg?branch=master)](https://coveralls.io/github/hobbyquaker/mqtt-meta?branch=master)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License][mit-badge]][mit-url]

> JSON Store with MQTT Interface


## Install

`npm install -g mqtt-meta`


## Usage

### Topics on which mqtt-meta publishes

#### `<name>/connected`

Publishes `1` when mqtt-meta is started and publishes `2` when all objects are published.

#### `<name>/rev`

Publishes the database revision.

#### `<name>/status/<id>`

### Topics subscribed by mqtt-meta

#### `<name>/set/<id>`

#### `<name>/extend/<id>`

#### `<name>/del/<id>`


## License

MIT (c) 2017 [Sebastian Raff](https://github.com/hobbyquaker)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE
