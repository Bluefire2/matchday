// @flow

'use strict';

const constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

import {getLeagueStandings, getLeagueGames, mcSampler, pointsFromGame, addStandings} from './util';
import Promise from 'bluebird';
import type {Game, Standings, StandingsFrequency} from "./util";

/**
 * Calculate the distributions of potential rankings for each team in [league], from games in the next [daysAhead] days,
 * and wrap it in a promise.
 *
 * @param {String} league
 * @param {Number} [daysAhead=7]
 * @param {Number} [N=10000] The number of iterations to run the Monte Carlo sampler.
 * @returns {Promise}
 */
module.exports = (league: string, daysAhead: number = 7, N: number = 10000): StandingsFrequency[] => { // 10000 for now
    const leagueCode = LEAGUES[league],
        scoring = pointsFromGame(leagueCode),
        sampler = mcSampler(scoring);

    const pStandings = getLeagueStandings(leagueCode),
        pGames = getLeagueGames(leagueCode),
        pSamples = pGames.then((games: Game[]) => {
            return sampler(games, N);
        });

    return Promise.join(pStandings, pSamples, (baseStandings: Standings, samples: StandingsFrequency[]): StandingsFrequency[] => {
        // for each sample, add the base standings
        return samples.map(({standings, frequency}: StandingsFrequency): StandingsFrequency => {
            return {
                standings: addStandings(baseStandings, standings),
                frequency
            }
        });
    });
};