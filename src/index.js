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
 * @param {Number} [N=1000000] The number of iterations to run the Monte Carlo sampler.
 * @param {Boolean} [verbose=false] Whether to display progress messages.
 * @returns {Promise}
 */
module.exports = (league: string, daysAhead: number = 7, N: number = 1000000, verbose: boolean = false): StandingsFrequency[] => { // 10000 for now
    const leagueCode = LEAGUES[league],
        scoring = pointsFromGame(leagueCode),
        sampler = mcSampler(scoring);

    const CHUNK_SIZE = 1000,
        chunks = Math.floor(N / CHUNK_SIZE),
        remainder = N % CHUNK_SIZE;

    const pStandings = getLeagueStandings(leagueCode),
        pGames = getLeagueGames(leagueCode);

    return pGames.then((games: Game[]) => {
        const promises = [];
        for (let i = 0; i < chunks; i++) {
            if (verbose) console.log(i * CHUNK_SIZE);
            promises.push(Promise.resolve(sampler(games, CHUNK_SIZE)));
        }
        promises.push(Promise.resolve(sampler(games, remainder)));

        return Promise.join(Promise.all(promises), pStandings, (data, baseStandings) => {
            const mappedDataUnflattened = data.map(elem => {
                return elem.map(({standings, frequency}) => {
                    return {
                        standings: addStandings(baseStandings, standings),
                        frequency
                    };
                });
            });

            return [].concat.apply([], mappedDataUnflattened);
        });
    });
};