'use strict';

const constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

const {getLeagueStandings, getLeagueGames} = require('./util'),
    Promise = require('bluebird');

/**
 * Calculate the distributions of potential rankings for each team in [league], from games in the next [daysAhead] days,
 * and wrap it in a promise.
 *
 * @param {String} league
 * @param {Number} [daysAhead=7]
 * @param {Number} [iterations=10] The number of iterations to run the Monte Carlo sampler.
 * @returns {Promise}
 */
module.exports = (league, daysAhead = 7, iterations = 10) => { // 10 for now
    const standingsPromise = getLeagueStandings(league),
        gamesPromise = getLeagueGames(league, daysAhead);

    return Promise.all([standingsPromise, gamesPromise]).then(values => {
        const standings = values[0],
            games = values[1];


    });
};