'use strict';

var _util = require('./util');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

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
 * @returns {Promise}
 */
module.exports = function (league) {
    var daysAhead = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 7;
    var N = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1000000;
    var verbose = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    // 10000 for now
    var leagueCode = LEAGUES[league],
        scoring = (0, _util.pointsFromGame)(leagueCode),
        sampler = (0, _util.mcSampler)(scoring);

    var CHUNK_SIZE = 1000,
        // TODO: make this adjustable by the user
    chunks = Math.floor(N / CHUNK_SIZE),
        remainder = N % CHUNK_SIZE;

    var pStandings = (0, _util.getLeagueStandings)(leagueCode),
        pGames = (0, _util.getLeagueGames)(leagueCode);

    return pGames.then(function (games) {
        var promises = [];

        var _loop = function _loop(i) {
            var samplerCallback = verbose ? function () {
                console.log(i * CHUNK_SIZE + ' done!');
            } : function () {};
            promises.push(_bluebird2.default.resolve(sampler(games, CHUNK_SIZE, samplerCallback)));
        };

        for (var i = 0; i < chunks; i++) {
            _loop(i);
        }
        promises.push(_bluebird2.default.resolve(sampler(games, remainder)));

        return _bluebird2.default.join(_bluebird2.default.all(promises), pStandings, function (data, baseStandings) {
            var flattenedData = data.reduce(function (acc, elem) {
                return (0, _util.mergeFrequencyMaps)(acc, elem);
            }, new Map());

            return flattenedData; // TODO: add the base standings to the keys
        });
    });
};