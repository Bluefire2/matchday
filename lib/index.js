'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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
 * @param {Number} [CHUNK_SIZE=10000]
 * @returns {Promise}
 */
module.exports = function (league) {
    var daysAhead = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 7;
    var N = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1000000;
    var verbose = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    var CHUNK_SIZE = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 10000;

    var leagueCode = LEAGUES[league],
        scoring = (0, _util.pointsFromGame)(leagueCode),
        sampler = (0, _util.mcSampler)(scoring);

    var chunks = Math.floor(N / CHUNK_SIZE),
        remainder = N % CHUNK_SIZE;

    var pStandings = (0, _util.getLeagueStandings)(leagueCode),
        pGames = (0, _util.getLeagueGames)(leagueCode, daysAhead);

    if (verbose) console.log('Fetching games...');
    return pGames.then(function (games) {
        var promises = [];
        if (verbose) console.log(games.length + ' games downloaded, starting sampling...');

        var _loop = function _loop(i) {
            var samplerCallback = verbose ? function () {
                console.log((i + 1) * CHUNK_SIZE + ' samples done.');
            } : function () {};
            promises.push(_bluebird2.default.resolve(sampler(games, CHUNK_SIZE, samplerCallback)));
        };

        for (var i = 0; i < chunks; i++) {
            _loop(i);
        }
        promises.push(_bluebird2.default.resolve(sampler(games, remainder)));

        return _bluebird2.default.join(_bluebird2.default.all(promises), pStandings, function (data, baseStandings) {
            var flattenedMap = data.reduce(function (acc, elem) {
                return (0, _util.mergeFrequencyMaps)(acc, elem);
            }, new Map()),
                dataWithBaseStandings = new Map();

            if (verbose) console.log('Sampling done, applying base standings...');

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = flattenedMap[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var _step$value = _slicedToArray(_step.value, 2),
                        standingsAsString = _step$value[0],
                        frequency = _step$value[1];

                    // TODO: optimise this somehow, so that it doesn't deserialise and then serialise again...
                    var standings = JSON.parse(standingsAsString),
                        totalStandingsAsString = JSON.stringify((0, _util.addStandings)(baseStandings, standings)),
                        probability = frequency / N;
                    dataWithBaseStandings.set(totalStandingsAsString, probability);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            if (verbose) console.log('Finished.');

            return dataWithBaseStandings;
        });
    });
};