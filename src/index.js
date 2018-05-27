'use strict';

const constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

const parse = require('csv-parse'),
    {leagueToID} = require('./util'),
    fs = require('fs'),
    Promise = require('bluebird'),
    moment = require('moment');

moment().format();

const getGames = (league, daysAhead = 7) => {
    // to round up to the nearest day, we can add 1 day and then round down:
    const maxDate = moment().add(daysAhead + 1, 'days').startOf('day');
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
                    parse(csv, {columns: true}, (csvError, output) => {
                        if (csvError) {
                            reject(csvError);
                        } else {
                            const matchesFromLeagueBeforeMaxDate =
                                output
                                    .filter(({league_id}) => parseInt(league_id) === leagueID) // filter league
                                    .filter(({date}) => { // filter date
                                        const d = moment(date, 'YYYY-MM-DD');
                                        return d.isAfter(moment()) && d.isBefore(maxDate);
                                    })
                                    .map(({date, team1, team2, prob1, prob2, probtie, proj_score1, proj_score2}) => {
                                        // keep only relevant properties
                                        return {date, team1, team2, prob1, prob2, probtie, proj_score1, proj_score2};
                                    });
                            resolve(matchesFromLeagueBeforeMaxDate);
                        }
                    });
                }
            });
        } else {
            reject('Invalid league');
        }
    });
};

module.exports.getGames = getGames; // for testing
/**
 * Fetch the following:
 *  - The match data for all teams in [league] for the next [daysAhead] days
 *  - The current standings of the league
 * and wrap it in a promise.
 * @param league
 * @param daysAhead
 */
module.exports.matchday = (league, daysAhead = 7) => {
    // empty for now
};