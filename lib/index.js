'use strict';

const constants = require('./constants'),
      LEAGUES = constants.LEAGUES;

const { getLeagueStandings, getLeagueGames, mcSampler, pointsFromGame, addStandings } = require('./util'),
      Promise = require('bluebird');

/**
 * Calculate the distributions of potential rankings for each team in [league], from games in the next [daysAhead] days,
 * and wrap it in a promise.
 *
 * @param {String} league
 * @param {Number} [daysAhead=7]
 * @param {Number} [N=10000] The number of iterations to run the Monte Carlo sampler.
 * @returns {Promise}
 */
module.exports = (league, daysAhead = 7, N = 10000) => {
    // 10000 for now
    const leagueCode = LEAGUES[league],
          scoring = pointsFromGame(leagueCode),
          sampler = mcSampler(scoring);

    const pStandings = getLeagueStandings(leagueCode),
          pGames = getLeagueGames(leagueCode),
          pSamples = pGames.then(games => {
        return sampler(games, N);
    });

    return Promise.join(pStandings, pSamples, (baseStandings, samples) => {
        // for each sample, add the base standings
        return samples.map(({ standings, frequency }) => {
            return {
                standings: addStandings(baseStandings, standings),
                frequency
            };
        });
    });
};