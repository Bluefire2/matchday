"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.mcSampler = exports.mcSample = exports.compareStandings = exports.teamOrderingFromGames = exports.addStandings = exports.mergeFrequencyMaps = exports.getLeagueGames = exports.getLeagueStandings = exports.pointsFromGame = exports.leagueToID = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _constants = require("./constants");

var _convert = require("./convert");

var _bluebird = require("bluebird");

var _bluebird2 = _interopRequireDefault(_bluebird);

var _es = require("csv-parse/lib/es5");

var _es2 = _interopRequireDefault(_es);

var _moment = require("moment");

var _moment2 = _interopRequireDefault(_moment);

var _axios = require("axios");

var _axios2 = _interopRequireDefault(_axios);

var _cheerio = require("cheerio");

var _cheerio2 = _interopRequireDefault(_cheerio);

var _sortUnique = require("sort-unique");

var _sortUnique2 = _interopRequireDefault(_sortUnique);

var _diacritics = require("diacritics");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var parse = _bluebird2.default.promisify(_es2.default);
(0, _moment2.default)().format();

/**
 * Gives the SPI league id for [league].
 *
 * @param league
 * @returns {number}
 */
var leagueToID = exports.leagueToID = function leagueToID(league) {
    switch (league) {
        case _constants.LEAGUES.PREMIER:
            return 2411;
        case _constants.LEAGUES.BRASILEIRAO:
            return 2105;
        default:
            return 0;
    }
};

/**
 * Returns a function that maps wins, losses and ties to points for teams in league [league]. A win is represented by
 * [1], a tie by [0], and a loss by [-1].
 *
 * @param league
 * @returns {function(*)}
 */
var pointsFromGame = exports.pointsFromGame = function pointsFromGame(league) {
    // TODO: make this depend on the league
    var win = 3,
        tie = 1,
        loss = 0;

    return function (result) {
        switch (result) {
            case 1:
                return [win, loss];
            case 0:
                return [tie, tie];
            case -1:
                return [loss, win];
            default:
                return [0, 0];
        }
    };
};

/**
 * Returns, via a random sample, whether the game with probabilities specified by the parameters resulted in a win,
 * loss, or tie. A win is represented by [1], a tie by [0], and a loss by [-1].
 *
 * Preconditions:
 *  - [pWin], [pTie] and [pLoss] must add to 1.
 *
 * @param {number} pWin The probability of winning the game.
 * @param {number} pTie The probability of drawing the game.
 * @param {number} pLoss The probability of losing the game.
 * @returns {number}
 */
var winTieLossSample = function winTieLossSample(pWin, pTie, pLoss) {
    var r = Math.random();

    if (r < pWin) {
        return 1;
    } else if (r < pWin + pTie) {
        return 0;
    } else {
        return -1;
    }
};

/**
 * Returns the URL to parse league standings from for league [league]. To be used in conjunction with [getLeagueStandings].
 *
 * @param league
 * @returns {string}
 */
var leagueToStandingsURL = function leagueToStandingsURL(league) {
    switch (league) {
        case _constants.LEAGUES.PREMIER:
            return 'http://www.espn.com/soccer/standings/_/league/eng.1';
        case _constants.LEAGUES.BRASILEIRAO:
            return 'http://www.espn.com/soccer/standings/_/league/bra.1';
        default:
            return '';
    }
};

/**
 * Fetches the current league standings for league [league].
 *
 * @param league
 * @returns {Promise}
 */
var getLeagueStandings = exports.getLeagueStandings = function getLeagueStandings(league) {
    var url = leagueToStandingsURL(league);
    return _axios2.default.get(url).then(function (response) {
        var $ = _cheerio2.default.load(response.data),
            rows = $('.standings.has-team-logos tbody tr');

        return rows.map(function (i, elem) {
            var tds = $(this).find('td'),
                teamTd = $(tds[0]),
                team = $(teamTd).find('span.team-names').text(),
                goalDiffTd = $(tds[7]),
                goalDiff = parseInt($(goalDiffTd).text()),
                pointsTd = $(tds[8]),
                points = parseInt($(pointsTd).text());
            return {
                team: (0, _convert.convertESPNTeam)((0, _diacritics.remove)(team)),
                goalDiff: goalDiff,
                points: points
            };
        }).get();
    });
};

/**
 * Fetches the games for the league specified, within the specified timeframe.
 *
 * @param league
 * @param daysAhead
 * @returns {Promise}
 */
var getLeagueGames = exports.getLeagueGames = _bluebird2.default.method(function (league, daysAhead) {
    // to round up to the nearest day, we can add 1 day and then round down:
    var maxDate = (0, _moment2.default)().add(daysAhead + 1, 'days').startOf('day');
    var leagueID = leagueToID(league);
    return _axios2.default.get(_constants.GAMES_CSV_URL).then(function (_ref) {
        var csv = _ref.data;

        return parse(csv, { columns: true });
    }).then(function (output) {
        return output.filter(function (_ref2) {
            var league_id = _ref2.league_id;
            return parseInt(league_id) === leagueID;
        }) // filter league
        .filter(function (_ref3) {
            var date = _ref3.date;
            // filter date
            var d = (0, _moment2.default)(date, 'YYYY-MM-DD');
            return d.isAfter((0, _moment2.default)()) && d.isBefore(maxDate);
        }).map(function (_ref4) {
            var date = _ref4.date,
                team1 = _ref4.team1,
                team2 = _ref4.team2,
                prob1 = _ref4.prob1,
                prob2 = _ref4.prob2,
                probtie = _ref4.probtie,
                proj_score1 = _ref4.proj_score1,
                proj_score2 = _ref4.proj_score2;

            // keep only relevant properties
            return {
                date: date,
                team1: (0, _diacritics.remove)(team1),
                team2: (0, _diacritics.remove)(team2),
                prob1: prob1,
                prob2: prob2,
                probtie: probtie,
                proj_score1: proj_score1,
                proj_score2: proj_score2 };
        });
    });
});

/**
 * Returns the *index* of the standing of [teamA] in the [standings] array; if there is no such team in [standings] then
 * returns undefined.
 *
 * @param standings
 * @param teamA
 * @returns {number}
 */
var getStandingOfTeam = function getStandingOfTeam(standings, teamA) {
    return standings.findIndex(function (_ref5) {
        var team = _ref5.team;
        return team === teamA;
    });
};

/**
 * Merge two maps of standings to frequencies, adding the frequencies for duplicate keys. Note that this function
 * mutates the maps!
 *
 * @param {FrequencyMap} mapA
 * @param {FrequencyMap} mapB
 * @returns {FrequencyMap}
 */
var mergeFrequencyMaps = exports.mergeFrequencyMaps = function mergeFrequencyMaps(mapA, mapB) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = mapB[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _step$value = _slicedToArray(_step.value, 2),
                k = _step$value[0],
                v = _step$value[1];

            var valueA = mapA.get(k);
            var newValue = v;
            if (typeof valueA !== 'undefined') {
                newValue += valueA;
            }
            mapA.set(k, newValue);
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

    return mapA;
};

/**
 * Adds two sets of team standings together. For each team, adds the goal difference and points. Returns the new
 * standings array.
 *
 * Preconditions:
 *  - [standingsA] and [standingsB] must be proper standings objects
 *
 * @param standingsA
 * @param standingsB
 * @returns {Array}
 */
var addStandings = exports.addStandings = function addStandings(standingsA, standingsB) {
    var totalStandings = JSON.parse(JSON.stringify(standingsA)); // deep copy

    // can't spell "functional" without "fun" :)
    return standingsB.reduce(function (acc, _ref6) {
        var team = _ref6.team,
            goalDiff = _ref6.goalDiff,
            points = _ref6.points;

        var standingSoFar = getStandingOfTeam(acc, team);
        if (standingSoFar === -1) {
            // this is a new team, so just append
            // Array.concat shouldn't be worse than O(1) if the second "array" only has one item
            return acc.concat([{ team: team, goalDiff: goalDiff, points: points }]);
        } else {
            // this team already exists in [standingsA], so we need to alter it
            var _acc$standingSoFar = acc[standingSoFar],
                goalDiffSoFar = _acc$standingSoFar.goalDiff,
                pointsSoFar = _acc$standingSoFar.points;

            // TODO: make this fully functional (non-mutating) if memory isn't an issue:

            acc[standingSoFar] = { team: team, goalDiff: goalDiff + goalDiffSoFar, points: points + pointsSoFar };
            return acc;
        }
    }, totalStandings);
};

/**
 * Calculates the ordering of teams to be used in populating the sample object.
 *
 * @param {Game[]} games The games that are being sampled.
 * @return {Map<String, Number>}
 */
var teamOrderingFromGames = exports.teamOrderingFromGames = function teamOrderingFromGames(games) {
    var teams = games.reduce(function (acc, _ref7) {
        var team1 = _ref7.team1,
            team2 = _ref7.team2;

        return acc.concat([team1, team2]);
    }, []);
    var uniqueTeams = (0, _sortUnique2.default)(teams),
        ordering = new Map();
    uniqueTeams.forEach(function (elem, index) {
        ordering.set(elem, index);
    });
    return ordering;
};

/**
 * Generates an empty team standing initialised with zero values.
 *
 * @param {string} team The name of the team.
 * @returns {Standing}
 */
var emptyStanding = function emptyStanding(team) {
    return {
        team: team,
        goalDiff: 0,
        points: 0
    };
};

/**
 * Sorting comparator function for standings. Returns -1 for above, 1 for below, and 0 for equal.
 *
 * @param {Standing} standingA
 * @param {Standing} standingB
 */
var compareStandings = exports.compareStandings = function compareStandings(_ref8, _ref9) {
    var teamA = _ref8.team,
        pointsA = _ref8.points,
        goalDiffA = _ref8.goalDiff;
    var teamB = _ref9.team,
        pointsB = _ref9.points,
        goalDiffB = _ref9.goalDiff;

    if (pointsA < pointsB) return 1;else if (pointsA > pointsB) return -1;else {
        if (goalDiffA < goalDiffB) return 1;else if (goalDiffA > goalDiffB) return -1;else return teamA < teamB ? 1 : -1; // TODO: how should this actually work?
    }
};

/**
 * Generates a single Monte Carlo sample from the games array [games] by the following method:
 *  - Compute a single outcome sample for the first game, resulting in a win, loss, or tie.
 *  - Compute the points each team in the game receives as a result of said outcome, using the scoring function [pts].
 *  - Create a mini set of "standings" for the two teams, based on the point values from the previous step.
 *  - Repeat the above steps for each game, and aggregate all the "standings" into one standings array, and return it.
 *
 * @param {Map<String, Number>} teamOrdering An ordering for all the teams in this league that have games, in the form
 * of a Map of team names to indices. For example, if the league contains teams A, B and C, but we are only sampling
 * from games with B and C, the map must not contain A. For this function to work properly, this parameter must be kept
 * constant over subsequent calls. This is achieved in [mcSampler()].
 * @param {Game[]} games The array of games to be played. Each game object must have the following properties:
 *  - team1, team2: the names of the two teams.
 *  - prob1, prob2, probtie: the probabilities of team 1 winning, team 2 winning, or a tie (these must sum to 1).
 * @param {PointsFunction} pts The scoring function, which must map the numbers 1, 0, and -1 to an array of two integer
 * values. This function should be generated from a league using [pointsFromGame].
 * @returns {Standings} The standings from playing each game.
 */
var mcSample = exports.mcSample = function mcSample(teamOrdering, games, pts) {
    /*
     * The key here is the fact that addStandings() is incredibly inefficient in this particular context. This is
     * because we have two crucial pieces of information: that we're only adding two teams at a time, and that we can
     * predict the order of each team in the rankings array. Knowing both of those things allows an optimisation to be
     * made, bypassing the more generic addStandings.
     *
     * How do we know the order of each team? Well, we can calculate it for every league. Now, what is a deterministic
     * method that puts all of the teams in a specific order? That's right, we can order by team name, since we can
     * assume that all teams have different names (we can't make the same assumption about goal differences or points).
     * In order to avoid calculating this every time, we can calculate it once in mcSampler() and just pass it into
     * mcSample() every time it is called.
     */
    var gameResults = games.map(function (_ref10) {
        var team1 = _ref10.team1,
            team2 = _ref10.team2,
            prob1 = _ref10.prob1,
            prob2 = _ref10.prob2,
            probtie = _ref10.probtie;

        // TODO: implement goal estimation for goal difference
        var goals1 = 0,
            goals2 = 0,
            gd = goals1 - goals2,
            outcome = winTieLossSample(prob1, probtie, prob2),
            _pts = pts(outcome),
            _pts2 = _slicedToArray(_pts, 2),
            points1 = _pts2[0],
            points2 = _pts2[1];

        // return a standings array


        return [{
            team: team1,
            goalDiff: gd,
            points: points1
        }, {
            team: team2,
            goalDiff: -gd,
            points: points2
        }];
    });

    // Fill the array with empty standing objects
    var emptyStandings = [];
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = teamOrdering[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _step2$value = _slicedToArray(_step2.value, 2),
                _team3 = _step2$value[0],
                index = _step2$value[1];

            emptyStandings[index] = emptyStanding(_team3);
        }
    } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
            }
        } finally {
            if (_didIteratorError2) {
                throw _iteratorError2;
            }
        }
    }

    return gameResults.reduce(function (acc, _ref11) {
        var _ref12 = _slicedToArray(_ref11, 2),
            standingA = _ref12[0],
            standingB = _ref12[1];

        // destructure here instead of the function signature to avoid clutter
        var teamA = standingA.team,
            goalDiffA = standingA.goalDiff,
            pointsA = standingA.points,
            teamB = standingB.team,
            goalDiffB = standingB.goalDiff,
            pointsB = standingB.points;


        var teamAIndex = teamOrdering.get(teamA),
            teamBIndex = teamOrdering.get(teamB);

        if (typeof teamAIndex !== 'undefined') {
            // this check keeps flow happy
            // merge standings as necessary
            var _acc$teamAIndex = acc[teamAIndex],
                _team = _acc$teamAIndex.team,
                _goalDiff = _acc$teamAIndex.goalDiff,
                _points = _acc$teamAIndex.points; // guaranteed to be defined since we've filled the array

            acc[teamAIndex] = { team: _team, goalDiff: _goalDiff + goalDiffA, points: _points + pointsA };
        }

        if (typeof teamBIndex !== 'undefined') {
            // merge standings as necessary
            var _acc$teamBIndex = acc[teamBIndex],
                _team2 = _acc$teamBIndex.team,
                _goalDiff2 = _acc$teamBIndex.goalDiff,
                _points2 = _acc$teamBIndex.points;

            acc[teamBIndex] = { team: _team2, goalDiff: _goalDiff2 + goalDiffB, points: _points2 + pointsB };
        }

        return acc;
    }, emptyStandings);
};

/**
 * Creates a Monte Carlo sampler for a specific scoring function: a function that takes a certain number of Monte Carlo
 * samples from an array of games, as above, and returns an array of the sample team standings, with frequencies for
 * each distinct sample. The sampler takes the following parameters:
 *  - [N]: the number of samples to take.
 *  - [callback]: the function to run when sampling has finished.
 *
 * @param {Game[]} games The array of games to sample from.
 * @param {PointsFunction} pts The scoring function; the same as the parameter of the same name in [mcSample].
 * @returns {Function} The sampler function.
 */
var mcSampler = exports.mcSampler = function mcSampler(games, pts) {
    // calculate the team ordering
    var ordering = teamOrderingFromGames(games);
    return function (N) {
        var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

        var samples = [];
        for (var i = 0; i < N; i++) {
            samples.push(mcSample(ordering, games, pts));
        }

        callback();
        return samples;
    };
};