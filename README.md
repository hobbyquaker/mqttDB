<img align="left" src="https://raw.githubusercontent.com/wiki/hobbyquaker/mqttDB/images/logo.png"> This is a NoSQL Database, to be precise: a JSON document store with MQTT interface, CouchDB/MapReduce inspired views,
implemented in Node.js. 🤠


[![NPM version](https://badge.fury.io/js/mqttdb.svg)](http://badge.fury.io/js/mqttdb)
[![Dependency Status](https://img.shields.io/gemnasium/hobbyquaker/mqttDB.svg?maxAge=2592000)](https://gemnasium.com/github.com/hobbyquaker/mqttDB)
[![Build Status](https://travis-ci.org/hobbyquaker/mqttDB.svg?branch=master)](https://travis-ci.org/hobbyquaker/mqttDB)
[![Coverage Status](https://coveralls.io/repos/github/hobbyquaker/mqttDB/badge.svg?branch=master)](https://coveralls.io/github/hobbyquaker/mqttDB?branch=master)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License][mit-badge]][mit-url]


It's intended to be used as a database for storing metadata in systems that use MQTT as message bus, I'm using it in 
conjunction with [mqtt-smarthome](https://github.com/mqtt-smarthome/mqtt-smarthome), but I think it could be useful in
other MQTT based environments also.

You can create and modify documents by publishing JSON payloads to MQTT and receive document changes by simply 
subscribing to certain topics. You can create views by defining map and reduce functions and filter document ids with 
MQTT style wildcards.

_Note that this project is not associated with or endorsed by http://mqtt.org_

## Documentation

* [Introduction](https://github.com/hobbyquaker/mqttDB/wiki/Introduction)
* [Install](https://github.com/hobbyquaker/mqttDB/wiki/Install)
* [Command Line Parameters](https://github.com/hobbyquaker/mqttDB/wiki/Command-Line-Parameters)
  * [Connecting to the MQTT Broker](https://github.com/hobbyquaker/mqttDB/wiki/Command-Line-Parameters#connecting-to-the-mqtt-broker)
* [WebUI](https://github.com/hobbyquaker/mqttDB/wiki/WebUI)
* [Documents](https://github.com/hobbyquaker/mqttDB/wiki/Documents)
  * [Document IDs](https://github.com/hobbyquaker/mqttDB/wiki/Documents#ids)
  * [Create or Overwrite Documents](https://github.com/hobbyquaker/mqttDB/wiki/Documents#create-or-overwrite-a-document)
  * [Extend Documents](https://github.com/hobbyquaker/mqttDB/wiki/Documents#extend-a-document)
  * [Delete Documents](https://github.com/hobbyquaker/mqttDB/wiki/Documents#deletion-of-documents)
  * [Property Access](https://github.com/hobbyquaker/mqttDB/wiki/Documents#property-access)
  * [Internal Properties](https://github.com/hobbyquaker/mqttDB/wiki/Documents#internal-properties)
* [Views](https://github.com/hobbyquaker/mqttDB/wiki/Views)
  * [What are Views?](https://github.com/hobbyquaker/mqttDB/wiki/Views#what-are-views)
  * [Create Views](https://github.com/hobbyquaker/mqttDB/wiki/Views#create-views)
  * [Delete Views](https://github.com/hobbyquaker/mqttDB/wiki/Views#delete-views)
  * [Javascript](https://github.com/hobbyquaker/mqttDB/wiki/Views#javascript)
  * [How Views are Composed](https://github.com/hobbyquaker/mqttDB/wiki/Views#how-views-are-composed)
* [View Examples](https://github.com/hobbyquaker/mqttDB/wiki/View-Examples)
* [Topic Reference](https://github.com/hobbyquaker/mqttDB/wiki/Topics)
  * [Topics on which mqttDB publishes](https://github.com/hobbyquaker/mqttDB/wiki/Topics#topics-on-which-mqttdb-publishes)
  * [Topics subscribed by mqttDB](https://github.com/hobbyquaker/mqttDB/wiki/Topics#topics-subscribed-by-mqttdb)
* [Sandbox Reference](https://github.com/hobbyquaker/mqttDB/wiki/Sandbox)
* [Performance](https://github.com/hobbyquaker/mqttDB/wiki/Performance)


## Contributing

Any form of feedback is highly appreciated, may it be questions, suggestions, feature requests, bug reports, critics, 
salutes or rants! 😉 Feel free to [create an Issue](https://github.com/hobbyquaker/mqttDB/issues/new)!

Pull Requests Welcome!


## License

MIT (c) 2017 [Sebastian Raff](https://github.com/hobbyquaker)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE
