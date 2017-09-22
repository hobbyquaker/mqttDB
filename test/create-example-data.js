const Mqtt = require('mqtt');

const mqtt = Mqtt.connect('mqtt://127.0.0.1');

const objects = [
    {type: 'Minion', name: 'Stuart', eyes: 1},
    {type: 'Minion', name: 'Carl', eyes: 1},
    {type: 'Minion', name: 'Kevin', eyes: 2},
    {type: 'Minion', name: 'Bob', eyes: 2},
    {type: 'Minion', name: 'Jerry', eyes: 2},
    {type: 'Minion', name: 'Phil', eyes: 2},
    {type: 'Minion', name: 'Tom', eyes: 2},
    {type: 'Minion', name: 'Tim', eyes: 2},

    {type: 'Simpson', name: 'Homer'},
    {type: 'Simpson', name: 'Marge'},
    {type: 'Simpson', name: 'Lisa'},
    {type: 'Simpson', name: 'Bart'},
    {type: 'Simpson', name: 'Maggie'},

    {type: 'Moon', name: 'Phobos', planet: 'Mars'},
    {type: 'Moon', name: 'Deimos', planet: 'Mars'},
    {type: 'Moon', name: 'Moon', planet: 'Earth'},
    {type: 'Moon', name: 'Europa', planet: 'Jupiter'},
    {type: 'Moon', name: 'Io', planet: 'Jupiter'},
    {type: 'Moon', name: 'Ganymed', planet: 'Jupiter'},
    {type: 'Moon', name: 'Kallisto', planet: 'Jupiter'},
    {type: 'Moon', name: 'Tethys', planet: 'Saturn'},
    {type: 'Moon', name: 'Dione', planet: 'Saturn'},
    {type: 'Moon', name: 'Rhea', planet: 'Saturn'},
    {type: 'Moon', name: 'Titan', planet: 'Saturn'},
    {type: 'Moon', name: 'Iapetus', planet: 'Saturn'},
    {type: 'Moon', name: 'Miranda', planet: 'Uranus'},
    {type: 'Moon', name: 'Ariel', planet: 'Uranus'},
    {type: 'Moon', name: 'Umbriel', planet: 'Uranus'},
    {type: 'Moon', name: 'Titania', planet: 'Uranus'},
    {type: 'Moon', name: 'Oberon', planet: 'Uranus'},
    {type: 'Moon', name: 'Triton', planet: 'Netpun'},
    {type: 'Moon', name: 'Nereid', planet: 'Netpun'}
];

let count = 0;
objects.forEach(obj => {
    mqtt.publish('meta/set/' + obj.type + '/' + (count++), JSON.stringify(obj));
});
