'use strict';

const constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

const {getLeagueStandings, getLeagueGames} = require('./util'),
    Promise = require('bluebird');

/**
 * Fetch the following:
 *  - The match data for all teams in [league] for the next [daysAhead] days
 *  - The current standings of the league
 * and wrap it in a promise.
 * @param league
 * @param daysAhead
 */
module.exports = (league, daysAhead = 7) => {
    const standingsPromise = getLeagueStandings(league),
        gamesPromise = getLeagueGames(league, daysAhead);

    return Promise.all([standingsPromise, gamesPromise]).then(values => {
        const standings = values[0],
            games = values[1];

        return {standings, games}; // for now
    });
};