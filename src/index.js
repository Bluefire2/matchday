'use strict';

const constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

const parse = require('csv-parse'),
    {leagueToID} = require('./util'),
    fs = require('fs'),
    Promise = require('bluebird');

/**
 * Fetch the following:
 *  - The match data for all teams in [league] for the next [daysAhead] days
 *  - The current standings of the league
 * and wrap it in a promise.
 * @param league
 * @param daysAhead
 */
module.exports = (league, daysAhead) => {
    return new Promise((resolve, reject) => {
        if (league in LEAGUES) {
            const leagueID = leagueToID(LEAGUES[league]);
            // for now, get data from the hardcoded .csv file
            // TODO: change this and instead fetch live data from the server
            const filepath = './data/spi_matches.csv';
            fs.readFile(filepath, (error, csv) => {
                if (error) {
                    reject(error);
                } else {
                    parse(csv, (csvError, output) => {
                        if (csvError) {
                            reject(csvError);
                        } else {
                            // TODO: change this placeholder
                            resolve(output);
                        }
                    });
                }
            });
        } else {
            reject('Invalid league');
        }
    });
};