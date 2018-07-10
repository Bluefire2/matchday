// @flow

'use strict';

const constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

import {
    getLeagueStandings, getLeagueGames, mcSampler, pointsFromGame, addStandings, mergeFrequencyMaps,
    compareStandings
} from './util';
import Promise from 'bluebird';
import type {FrequencyMap, Game, Standing, Standings} from "./util";
import stream from 'stream';

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
                  CHUNK_SIZE: number = 10000): FrequencyMap => {
    const leagueCode = LEAGUES[league],
        scoring = pointsFromGame(leagueCode);

    const chunks = Math.floor(N / CHUNK_SIZE),
        remainder = N % CHUNK_SIZE;

    const pStandings = getLeagueStandings(leagueCode),
        pGames = getLeagueGames(leagueCode, daysAhead);

    if (verbose) console.log('Fetching games...');
    return Promise.join(pStandings, pGames, (standings: Standings, games: Game[]) => {
        const sampler = mcSampler(games, scoring),
            samplesStream = new stream.Readable({objectMode: true});

        const standingFrequencies = new Map(),
            nTeams = standings.length;
        // Initialise frequencies (all zeroes):
        standings.forEach(({team}: Standing) => {
            standingFrequencies.set(team, new Array(nTeams).fill(0));
        });

        const reduceSample = (sample: Standings) => {
            // We got the sample, now reduce on the fly:
            const total = addStandings(standings, sample),
                sorted = total.sort(compareStandings);
            sorted.forEach(({team}: Standing, index: number) => {
                // For each standing, merge into the frequency map:
                const currentFrequencies = standingFrequencies.get(team);
                // damnit Flow,
                if (currentFrequencies !== undefined && currentFrequencies !== null) currentFrequencies[index]++;
                standingFrequencies.set(team, currentFrequencies);
            });
        };

        if (verbose) console.log(`${games.length} games downloaded, starting sampling...`);
        for (let i = 0; i < chunks; i++) {
            sampler(CHUNK_SIZE).forEach(reduceSample);
            console.log((i + 1) * CHUNK_SIZE + ' samples done.');
        }

        sampler(remainder).forEach(reduceSample);
        console.log('All samples done.');

        // probabilities are just frequencies divided by N
        const standingProbabilities = new Map();
        standingFrequencies.forEach((value: ?Array<number>, key: string) => {
            // need this check so Flow doesn't complain
            if (value !== undefined && value !== null) standingProbabilities.set(key, value.map(elem => elem / N));
        });

        return {
            probabilities: standingProbabilities,
            standings: standings
        };
    });
};

module.exports.leaguesSupported = Object.keys(LEAGUES);