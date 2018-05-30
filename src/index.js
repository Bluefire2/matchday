// @flow

'use strict';

const constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

import {getLeagueStandings, getLeagueGames, mcSampler, pointsFromGame, addStandings, mergeFrequencyMaps} from './util';
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
 * @param {Number} [CHUNK_SIZE=10000]
 * @returns {Promise}
 */
module.exports = (league: string,
                  daysAhead: number = 7,
                  N: number = 1000000,
                  verbose: boolean = false,
                  CHUNK_SIZE: number = 10000): StandingsFrequency[] => {
    const leagueCode = LEAGUES[league],
        scoring = pointsFromGame(leagueCode),
        sampler = mcSampler(scoring);

    const chunks = Math.floor(N / CHUNK_SIZE),
        remainder = N % CHUNK_SIZE;

    const pStandings = getLeagueStandings(leagueCode),
        pGames = getLeagueGames(leagueCode);

    return pGames.then((games: Game[]) => {
        const promises = [];
        if (verbose) console.log('Sampling...');
        for (let i = 0; i < chunks; i++) {
            let samplerCallback = verbose ? () => {
                console.log(i * CHUNK_SIZE + ' samples done.')
            } : () => {
            };
            promises.push(Promise.resolve(sampler(games, CHUNK_SIZE, samplerCallback)));
        }
        promises.push(Promise.resolve(sampler(games, remainder)));

        return Promise.join(Promise.all(promises), pStandings, (data, baseStandings) => {
            const flattenedMap = data.reduce((acc, elem) => mergeFrequencyMaps(acc, elem), new Map()),
                dataWithBaseStandings = new Map();

            if (verbose) console.log('Sampling done, applying base standings...');

            for (const [standingsAsString, frequency] of flattenedMap) {
                // TODO: optimise this somehow, so that it doesn't deserialise and then serialise again...
                const standings = JSON.parse(standingsAsString),
                    totalStandingsAsString = JSON.stringify(addStandings(baseStandings, standings));
                dataWithBaseStandings.set(totalStandingsAsString, frequency)
            }

            if (verbose) console.log('Finished.');

            return dataWithBaseStandings;
        });
    });
};