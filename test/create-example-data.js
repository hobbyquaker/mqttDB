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

    {type: 'Moon', order: 'I', name: 'Io', desc: '', diameter: 3643, year: 1610, planet: 'Jupiter'},
    {type: 'Moon', order: 'II', name: 'Europa', desc: '', diameter: 3122, year: 1610, planet: 'Jupiter'},
    {type: 'Moon', order: 'III', name: 'Ganymed', desc: '', diameter: 5262, year: 1610, planet: 'Jupiter'},
    {type: 'Moon', order: 'IV', name: 'Kallisto', desc: '', diameter: 4821, year: 1610, planet: 'Jupiter'},
    {type: 'Moon', order: 'V', name: 'Amalthea', desc: '', diameter: 168, year: 1892, planet: 'Jupiter'},
    {type: 'Moon', order: 'VI', name: 'Himalia', desc: '', diameter: 160, year: 1904, planet: 'Jupiter'},
    {type: 'Moon', order: 'VII', name: 'Elara', desc: '', diameter: 78, year: 1905, planet: 'Jupiter'},
    {type: 'Moon', order: 'VIII', name: 'Pasiphae', desc: '', diameter: 56, year: 1908, planet: 'Jupiter'},
    {type: 'Moon', order: 'IX', name: 'Sinope', desc: '', diameter: 38, year: 1914, planet: 'Jupiter'},
    {type: 'Moon', order: 'X', name: 'Lysithea', desc: '', diameter: 38, year: 1938, planet: 'Jupiter'},
    {type: 'Moon', order: 'XI', name: 'Carme', desc: '', diameter: 46, year: 1938, planet: 'Jupiter'},
    {type: 'Moon', order: 'XII', name: 'Ananke', desc: '', diameter: 28, year: 1951, planet: 'Jupiter'},
    {type: 'Moon', order: 'XIII', name: 'Leda', desc: '', diameter: 18, year: 1973, planet: 'Jupiter'},
    {type: 'Moon', order: 'XIV', name: 'Thebe', desc: 'S/1979 J 2', diameter: 98, year: 1979, planet: 'Jupiter'},
    {type: 'Moon', order: 'XV', name: 'Adrastea', desc: 'S/1979 J 1', diameter: 16, year: 1979, planet: 'Jupiter'},
    {type: 'Moon', order: 'XVI', name: 'Metis', desc: 'S/1979 J 3', diameter: 44, year: 1979, planet: 'Jupiter'},
    {type: 'Moon', order: 'XVII', name: 'Callirrhoe', desc: 'S/1999 J 1', diameter: 9, year: 2000, planet: 'Jupiter'},
    {type: 'Moon', order: 'XVIII', name: 'Themisto', desc: 'S/2000 J 1', diameter: 9, year: 1975, planet: 'Jupiter'},
    {type: 'Moon', order: 'XIX', name: 'Megaclite', desc: 'S/2000 J 8', diameter: 6, year: 2001, planet: 'Jupiter'},
    {type: 'Moon', order: 'XX', name: 'Taygete', desc: 'S/2000 J 9', diameter: 5, year: 2001, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXI', name: 'Chaldene', desc: 'S/2000 J 10', diameter: 4, year: 2001, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXII', name: 'Harpalyke', desc: 'S/2000 J 5', diameter: 4, year: 2001, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXIII', name: 'Kalyke', desc: 'S/2000 J 2', diameter: 5, year: 2001, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXIV', name: 'Iocaste', desc: 'S/2000 J 3', diameter: 5, year: 2001, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXV', name: 'Erinome', desc: 'S/2000 J 4', diameter: 3, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXVI', name: 'Isonoe', desc: 'S/2000 J 6', diameter: 4, year: 2001, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXVII', name: 'Praxidike', desc: 'S/2000 J 7', diameter: 7, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXVIII', name: 'Autonoe', desc: 'S/2001 J 1', diameter: 4, year: 2002, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXIX', name: 'Thyone', desc: 'S/2001 J 2', diameter: 4, year: 2002, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXX', name: 'Hermippe', desc: 'S/2001 J 3', diameter: 4, year: 2002, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXXI', name: 'Aitne', desc: 'S/2001 J 11', diameter: 3, year: 2002, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXXII', name: 'Eurydome', desc: 'S/2001 J 4', diameter: 3, year: 2002, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXXIII', name: 'Euanthe', desc: 'S/2001 J 7', diameter: 3, year: 2002, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXXIV', name: 'Euporie', desc: 'S/2001 J 10', diameter: 2, year: 2002, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXXV', name: 'Orthosie', desc: 'S/2001 J 9', diameter: 2, year: 2002, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXXVI', name: 'Sponde', desc: 'S/2001 J 5', diameter: 2, year: 2002, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXXVII', name: 'Kale', desc: 'S/2001 J 8', diameter: 2, year: 2002, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXXVIII', name: 'Pasithee', desc: 'S/2001 J 6', diameter: 2, year: 2002, planet: 'Jupiter'},
    {type: 'Moon', order: 'XXXIX', name: 'Hegemone', desc: 'S/2003 J 8', diameter: 3, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'XL', name: 'Mneme', desc: 'S/2003 J 21', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'XLI', name: 'Aoede', desc: 'S/2003 J 7', diameter: 4, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'XLII', name: 'Thelxinoe', desc: 'S/2003 J 22', diameter: 2, year: 2004, planet: 'Jupiter'},
    {type: 'Moon', order: 'XLIII', name: 'Arche', desc: 'S/2002 J 1', diameter: 3, year: 2002, planet: 'Jupiter'},
    {type: 'Moon', order: 'XLIV', name: 'Kallichore', desc: 'S/2003 J 11', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'XLV', name: 'Helike', desc: 'S/2003 J 6', diameter: 4, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'XLVI', name: 'Carpo', desc: 'S/2003 J 20', diameter: 3, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'XLVII', name: 'Eukelade', desc: 'S/2003 J 1', diameter: 4, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'XLVIII', name: 'Cyllene', desc: 'S/2003 J 13', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'XLIX', name: 'Kore', desc: 'S/2003 J 14', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'L', name: 'Herse', desc: 'S/2003 J 17', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'LI', name: '', desc: 'S/2010 J 1', diameter: 723, year: 2010, planet: 'Jupiter'},
    {type: 'Moon', order: 'LII', name: '', desc: 'S/2010 J 2', diameter: 588, year: 2010, planet: 'Jupiter'},
    {type: 'Moon', order: 'LIII', name: 'Dia', desc: 'S/2000 J 11', diameter: 4, year: 2000, planet: 'Jupiter'},
    {type: 'Moon', order: 'LIV', name: '', desc: 'S/2016 J 1', year: 2016, planet: 'Jupiter'},
    {type: 'Moon', order: 'LV', name: '', desc: 'S/2003 J 18', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'LVI', name: '', desc: 'S/2011 J 2', year: 2011, planet: 'Jupiter'},
    {type: 'Moon', order: 'LVII', name: '', desc: 'S/2003 J 5', diameter: 4, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'LVIII', name: '', desc: 'S/2003 J 15', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: 'LIX', name: '', desc: 'S/2017 J 1', year: 2017, planet: 'Jupiter'},
    {type: 'Moon', order: '', name: '', desc: 'S/2003 J 2', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: '', name: '', desc: 'S/2003 J 3', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: '', name: '', desc: 'S/2003 J 4', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: '', name: '', desc: 'S/2003 J 9', diameter: 1, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: '', name: '', desc: 'S/2003 J 10', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: '', name: '', desc: 'S/2003 J 12', diameter: 1, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: '', name: '', desc: 'S/2003 J 16', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: '', name: '', desc: 'S/2003 J 19', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: '', name: '', desc: 'S/2003 J 23', diameter: 2, year: 2003, planet: 'Jupiter'},
    {type: 'Moon', order: '', name: '', desc: 'S/2011 J', diameter: 163, year: 2011, planet: 'Jupiter'},

    {type: 'Moon', order: 'I', name: 'Mimas', desc: '', diameter: 396.4, year: 1789, planet: 'Saturn'},
    {type: 'Moon', order: 'II', name: 'Enceladus', desc: '', diameter: 504.2, year: 1789, planet: 'Saturn'},
    {type: 'Moon', order: 'III', name: 'Tethys', desc: '', diameter: 1066, year: 1684, planet: 'Saturn'},
    {type: 'Moon', order: 'IV', name: 'Dione', desc: '', diameter: 1123.4, year: 1684, planet: 'Saturn'},
    {type: 'Moon', order: 'V', name: 'Rhea', desc: '', diameter: 1529, year: 1672, planet: 'Saturn'},
    {type: 'Moon', order: 'VI', name: 'Titan', desc: '', diameter: 5150, year: 1655, planet: 'Saturn'},
    {type: 'Moon', order: 'VII', name: 'Hyperion', desc: '', diameter: 266, year: 1848, planet: 'Saturn'},
    {type: 'Moon', order: 'VIII', name: 'Iapetus', desc: '', diameter: 1436, year: 1671, planet: 'Saturn'},
    {type: 'Moon', order: 'IX', name: 'Phoebe', desc: '', diameter: 240, year: 1899, planet: 'Saturn'},
    {type: 'Moon', order: 'X', name: 'Janus', desc: 'S/1980 S 1', diameter: 178, year: 1966, planet: 'Saturn'},
    {type: 'Moon', order: 'XI', name: 'Epimetheus', desc: 'S/1980 S 3', diameter: 119, year: 1980, planet: 'Saturn'},
    {type: 'Moon', order: 'XII', name: 'Helene', desc: 'S/1980 S 6', diameter: 35.2, year: 1980, planet: 'Saturn'},
    {type: 'Moon', order: 'XIII', name: 'Telesto', desc: 'S/1980 S 13', diameter: 24.8, year: 1980, planet: 'Saturn'},
    {type: 'Moon', order: 'XIV', name: 'Calypso', desc: 'S/1980 S 25', diameter: 21.4, year: 1980, planet: 'Saturn'},
    {type: 'Moon', order: 'XV', name: 'Atlas', desc: 'S/1980 S 28', diameter: 32, year: 1980, planet: 'Saturn'},
    {type: 'Moon', order: 'XVI', name: 'Prometheus', desc: 'S/1980 S 27', diameter: 100, year: 1980, planet: 'Saturn'},
    {type: 'Moon', order: 'XVII', name: 'Pandora', desc: 'S/1980 S 26', diameter: 84, year: 1980, planet: 'Saturn'},
    {type: 'Moon', order: 'XVIII', name: 'Pan', desc: 'S/1981 S 13', diameter: 20, year: 1990, planet: 'Saturn'},
    {type: 'Moon', order: 'XIX', name: 'Ymir', desc: 'S/2000 S 1', diameter: 18, year: 2000, planet: 'Saturn'},
    {type: 'Moon', order: 'XX', name: 'Paaliaq', desc: 'S/2000 S 2', diameter: 22, year: 2000, planet: 'Saturn'},
    {type: 'Moon', order: 'XXI', name: 'Tarvos', desc: 'S/2000 S 4', diameter: 15, year: 2000, planet: 'Saturn'},
    {type: 'Moon', order: 'XXII', name: 'Ijiraq', desc: 'S/2000 S 6', diameter: 12, year: 2000, planet: 'Saturn'},
    {type: 'Moon', order: 'XXIII', name: 'Suttungr', desc: 'S/2000 S 12', diameter: 7, year: 2000, planet: 'Saturn'},
    {type: 'Moon', order: 'XXIV', name: 'Kiviuq', desc: 'S/2000 S 5', diameter: 16, year: 2000, planet: 'Saturn'},
    {type: 'Moon', order: 'XXV', name: 'Mundilfari', desc: 'S/2000 S 9', diameter: 7, year: 2000, planet: 'Saturn'},
    {type: 'Moon', order: 'XXVI', name: 'Albiorix', desc: 'S/2000 S 11', diameter: 32, year: 2000, planet: 'Saturn'},
    {type: 'Moon', order: 'XXVII', name: 'Skathi', desc: 'S/2000 S 8', diameter: 8, year: 2000, planet: 'Saturn'},
    {type: 'Moon', order: 'XXVIII', name: 'Erriapus', desc: 'S/2000 S 10', diameter: 10, year: 2000, planet: 'Saturn'},
    {type: 'Moon', order: 'XXIX', name: 'Siarnaq', desc: 'S/2000 S 3', diameter: 40, year: 2000, planet: 'Saturn'},
    {type: 'Moon', order: 'XXX', name: 'Thrymr', desc: 'S/2000 S 7', diameter: 7, year: 2000, planet: 'Saturn'},
    {type: 'Moon', order: 'XXXI', name: 'Narvi', desc: 'S/2003 S 1', diameter: 7, year: 2003, planet: 'Saturn'},
    {type: 'Moon', order: 'XXXII', name: 'Methone', desc: 'S/2004 S 1', diameter: 3, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: 'XXXIII', name: 'Pallene', desc: 'S/2004 S 2', diameter: 4, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: 'XXXIV', name: 'Polydeuces', desc: 'S/2004 S 5', diameter: 4, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: 'XXXV', name: 'Daphnis', desc: 'S/2005 S 1', diameter: 7, year: 2005, planet: 'Saturn'},
    {type: 'Moon', order: 'XXXVI', name: 'Aegir', desc: 'S/2004 S 10', diameter: 6, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: 'XXXVII', name: 'Bebhionn', desc: 'S/2004 S 11', diameter: 6, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: 'XXXVIII', name: 'Bergelmir', desc: 'S/2004 S 15', diameter: 6, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: 'XXXIX', name: 'Bestla', desc: 'S/2004 S 18', diameter: 7, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: 'XL', name: 'Farbauti', desc: 'S/2004 S 9', diameter: 5, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: 'XLI', name: 'Fenrir', desc: 'S/2004 S 16', diameter: 4, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: 'XLII', name: 'Fornjot', desc: 'S/2004 S 8', diameter: 6, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: 'XLIII', name: 'Hati', desc: 'S/2004 S 14', diameter: 6, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: 'XLIV', name: 'Hyrrokkin', desc: 'S/2004 S 19', diameter: 8, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: 'XLV', name: 'Kari', desc: 'S/2006 S 2', diameter: 7, year: 2006, planet: 'Saturn'},
    {type: 'Moon', order: 'XLVI', name: 'Loge', desc: 'S/2006 S 5', diameter: 6, year: 2006, planet: 'Saturn'},
    {type: 'Moon', order: 'XLVII', name: 'Skoll', desc: 'S/2006 S 8', diameter: 6, year: 2006, planet: 'Saturn'},
    {type: 'Moon', order: 'XLVIII', name: 'Surtur', desc: 'S/2006 S 7', diameter: 6, year: 2006, planet: 'Saturn'},
    {type: 'Moon', order: 'XLIX', name: 'Anthe', desc: 'S/2007 S 4', diameter: 2, year: 2007, planet: 'Saturn'},
    {type: 'Moon', order: 'L', name: 'Jarnsaxa', desc: 'S/2006 S 6', diameter: 6, year: 2006, planet: 'Saturn'},
    {type: 'Moon', order: 'LI', name: 'Greip', desc: 'S/2006 S 4', diameter: 6, year: 2006, planet: 'Saturn'},
    {type: 'Moon', order: 'LII', name: 'Tarqeq', desc: 'S/2007 S 1', diameter: 7, year: 2007, planet: 'Saturn'},
    {type: 'Moon', order: 'LIII', name: 'Aegaeon', desc: 'S/2008 S 1', diameter: 0.5, year: 2008, planet: 'Saturn'},
    {type: 'Moon', order: '', name: '', desc: 'S/2004 S 7', diameter: 6, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: '', name: '', desc: 'S/2004 S 12', diameter: 5, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: '', name: '', desc: 'S/2004 S 13', diameter: 6, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: '', name: '', desc: 'S/2004 S 17', diameter: 4, year: 2004, planet: 'Saturn'},
    {type: 'Moon', order: '', name: '', desc: 'S/2006 S 1', diameter: 6, year: 2006, planet: 'Saturn'},
    {type: 'Moon', order: '', name: '', desc: 'S/2006 S 3', diameter: 6, year: 2006, planet: 'Saturn'},
    {type: 'Moon', order: '', name: '', desc: 'S/2007 S 2', diameter: 6, year: 2007, planet: 'Saturn'},
    {type: 'Moon', order: '', name: '', desc: 'S/2007 S 3', diameter: 5, year: 2007, planet: 'Saturn'},
    {type: 'Moon', order: '', name: '', desc: 'S/2009 S 1', diameter: 0.3, year: '2009', planet: 'Saturn'},

    {type: 'Moon', order: 'I', name: 'Ariel', desc: '', diameter: 1158, year: 1851, planet: 'Uranus'},
    {type: 'Moon', order: 'II', name: 'Umbriel', desc: '', diameter: 1169, year: 1851, planet: 'Uranus'},
    {type: 'Moon', order: 'III', name: 'Titania', desc: '', diameter: 1578, year: 1787, planet: 'Uranus'},
    {type: 'Moon', order: 'IV', name: 'Oberon', desc: '', diameter: 1523, year: 1787, planet: 'Uranus'},
    {type: 'Moon', order: 'V', name: 'Miranda', desc: '', diameter: 472, year: 1948, planet: 'Uranus'},
    {type: 'Moon', order: 'VI', name: 'Cordelia', desc: 'S/1986 U 7', diameter: 40, year: 1986, planet: 'Uranus'},
    {type: 'Moon', order: 'VII', name: 'Ophelia', desc: 'S/1986 U 8', diameter: 43, year: 1986, planet: 'Uranus'},
    {type: 'Moon', order: 'VIII', name: 'Bianca', desc: 'S/1986 U 9', diameter: 51, year: 1986, planet: 'Uranus'},
    {type: 'Moon', order: 'IX', name: 'Cressida', desc: 'S/1986 U 3', diameter: 80, year: 1986, planet: 'Uranus'},
    {type: 'Moon', order: 'X', name: 'Desdemona', desc: 'S/1986 U 6', diameter: 64, year: 1986, planet: 'Uranus'},
    {type: 'Moon', order: 'XI', name: 'Juliet', desc: 'S/1986 U 2', diameter: 94, year: 1986, planet: 'Uranus'},
    {type: 'Moon', order: 'XII', name: 'Portia', desc: 'S/1986 U 1', diameter: 135, year: 1986, planet: 'Uranus'},
    {type: 'Moon', order: 'XIII', name: 'Rosalind', desc: 'S/1986 U 4', diameter: 72, year: 1986, planet: 'Uranus'},
    {type: 'Moon', order: 'XIV', name: 'Belinda', desc: 'S/1986 U 5', diameter: 81, year: 1986, planet: 'Uranus'},
    {type: 'Moon', order: 'XV', name: 'Puck', desc: 'S/1985 U 1', diameter: 162, year: 1985, planet: 'Uranus'},
    {type: 'Moon', order: 'XVI', name: 'Caliban', desc: 'S/1997 U 1', diameter: 72, year: 1997, planet: 'Uranus'},
    {type: 'Moon', order: 'XVII', name: 'Sycorax', desc: 'S/1997 U 2', diameter: 150, year: 1997, planet: 'Uranus'},
    {type: 'Moon', order: 'XVIII', name: 'Prospero', desc: 'S/1999 U 3', diameter: 50, year: 1999, planet: 'Uranus'},
    {type: 'Moon', order: 'XIX', name: 'Setebos', desc: 'S/1999 U 1', diameter: 47, year: 1999, planet: 'Uranus'},
    {type: 'Moon', order: 'XX', name: 'Stephano', desc: 'S/1999 U 2', diameter: 32, year: 1999, planet: 'Uranus'},
    {type: 'Moon', order: 'XXI', name: 'Trinculo', desc: 'S/2001 U 1', diameter: 18, year: 2001, planet: 'Uranus'},
    {type: 'Moon', order: 'XXII', name: 'Francisco', desc: 'S/2001 U 3', diameter: 22, year: 2001, planet: 'Uranus'},
    {type: 'Moon', order: 'XXIII', name: 'Margaret', desc: 'S/2003 U 3', diameter: 20, year: 2003, planet: 'Uranus'},
    {type: 'Moon', order: 'XXIV', name: 'Ferdinand', desc: 'S/2001 U 2', diameter: 21, year: 2001, planet: 'Uranus'},
    {type: 'Moon', order: 'XXV', name: 'Perdita', desc: 'S/1986 U 10', diameter: 30, year: 1986, planet: 'Uranus'},
    {type: 'Moon', order: 'XXVI', name: 'Mab', desc: 'S/2003 U 1', diameter: 16, year: 2003, planet: 'Uranus'},
    {type: 'Moon', order: 'XXVII', name: 'Cupid', desc: 'S/2003 U 2', diameter: 18, year: 2003, planet: 'Uranus'},

    {type: 'Moon', order: 'I', name: 'Triton', desc: '', diameter: 2707, year: 1846, planet: 'Neptun'},
    {type: 'Moon', order: 'II', name: 'Nereid', desc: '', diameter: 340, year: 1949, planet: 'Neptun'},
    {type: 'Moon', order: 'III', name: 'Naiad', desc: 'S/1989 N 6', diameter: 67, year: 1989, planet: 'Neptun'},
    {type: 'Moon', order: 'IV', name: 'Thalassa', desc: 'S/1989 N 5', diameter: 81, year: 1989, planet: 'Neptun'},
    {type: 'Moon', order: 'V', name: 'Despina', desc: 'S/1989 N 3', diameter: 150, year: 1989, planet: 'Neptun'},
    {type: 'Moon', order: 'VI', name: 'Galatea', desc: 'S/1989 N 4', diameter: 175, year: 1989, planet: 'Neptun'},
    {type: 'Moon', order: 'VII', name: 'Larissa', desc: 'S/1989 N 2', diameter: 195, year: 1981, planet: 'Neptun'},
    {type: 'Moon', order: 'VIII', name: 'Proteus', desc: 'S/1989 N 1', diameter: 420, year: 1989, planet: 'Neptun'},
    {type: 'Moon', order: 'IX', name: 'Halimede', desc: 'S/2002 N 1', diameter: 48, year: 2002, planet: 'Neptun'},
    {type: 'Moon', order: 'X', name: 'Psamathe', desc: 'S/2003 N 1', diameter: 38, year: 2003, planet: 'Neptun'},
    {type: 'Moon', order: 'XI', name: 'Sao', desc: 'S/2002 N 2', diameter: 44, year: 2002, planet: 'Neptun'},
    {type: 'Moon', order: 'XII', name: 'Laomedeia', desc: 'S/2002 N 3', diameter: 42, year: 2002, planet: 'Neptun'},
    {type: 'Moon', order: 'XIII', name: 'Neso', desc: 'S/2002 N 4', diameter: 60, year: 2002, planet: 'Neptun'},
    {type: 'Moon', order: 'XIV', name: '', desc: 'S/2004 N 1', diameter: 18, year: 2013, planet: 'Neptun'}

];

let count = 0;
objects.forEach(obj => {
    mqtt.publish('meta/set/' + obj.type + '/' + (count++), JSON.stringify(obj));
});

