'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var md5 = require('md5');

var LEAGUES = exports.LEAGUES = {
    PREMIER: md5('PREMIER'),
    BRASILEIRAO: md5('BRASILEIRAO')
};

var GAMES_CSV_URL = exports.GAMES_CSV_URL = 'https://projects.fivethirtyeight.com/soccer-api/club/spi_matches.csv';