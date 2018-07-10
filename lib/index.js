'use strict';

var _util = require('./util');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

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
module.exports = function (league) {
    var daysAhead = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 7;
    var N = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1000000;
    var verbose = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    var CHUNK_SIZE = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 10000;

    var leagueCode = LEAGUES[league],
        scoring = (0, _util.pointsFromGame)(leagueCode);

    var chunks = Math.floor(N / CHUNK_SIZE),
        remainder = N % CHUNK_SIZE;

    var pStandings = (0, _util.getLeagueStandings)(leagueCode),
        pGames = (0, _util.getLeagueGames)(leagueCode, daysAhead);

    if (verbose) console.log('Fetching games...');
    return _bluebird2.default.join(pStandings, pGames, function (standings, games) {
        var sampler = (0, _util.mcSampler)(games, scoring),
            samplesStream = new _stream2.default.Readable({ objectMode: true });

        var standingFrequencies = new Map(),
            nTeams = standings.length;
        // Initialise frequencies (all zeroes):
        standings.forEach(function (_ref) {
            var team = _ref.team;

            standingFrequencies.set(team, new Array(nTeams).fill(0));
        });

        var reduceSample = function reduceSample(sample) {
            // We got the sample, now reduce on the fly:
            var total = (0, _util.addStandings)(standings, sample),
                sorted = total.sort(_util.compareStandings);
            sorted.forEach(function (_ref2, index) {
                var team = _ref2.team;

                // For each standing, merge into the frequency map:
                var currentFrequencies = standingFrequencies.get(team);
                // damnit Flow,
                if (currentFrequencies !== undefined && currentFrequencies !== null) currentFrequencies[index]++;
                standingFrequencies.set(team, currentFrequencies);
            });
        };

        if (verbose) console.log(games.length + ' games downloaded, starting sampling...');
        for (var i = 0; i < chunks; i++) {
            sampler(CHUNK_SIZE).forEach(reduceSample);
            console.log((i + 1) * CHUNK_SIZE + ' samples done.');
        }

        sampler(remainder).forEach(reduceSample);
        console.log('All samples done.');

        // probabilities are just frequencies divided by N
        var standingProbabilities = new Map();
        standingFrequencies.forEach(function (value, key) {
            // need this check so Flow doesn't complain
            if (value !== undefined && value !== null) standingProbabilities.set(key, value.map(function (elem) {
                return elem / N;
            }));
        });

        return {
            probabilities: standingProbabilities,
            standings: standings
        };
    });
};

module.exports.leaguesSupported = Object.keys(LEAGUES);