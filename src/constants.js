const md5 = require('md5');

export const LEAGUES = {
    PREMIER: md5('PREMIER'),
    BRASILEIRAO: md5('BRASILEIRAO')
};

export const GAMES_CSV_URL = 'https://projects.fivethirtyeight.com/soccer-api/club/spi_matches.csv';