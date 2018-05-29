'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

var Promise = require('bluebird'),
    parse = Promise.promisify(require('csv-parse')),
    fs = Promise.promisifyAll(require('fs')),
    moment = require('moment'),
    axios = require('axios'),
    cheerio = require('cheerio');

moment().format();

/**
 * Gives the SPI league id for [league].
 *
 * @param league
 * @returns {number}
 */
var leagueToID = exports.leagueToID = function leagueToID(league) {
    switch (league) {
        case LEAGUES.PREMIER:
            return 2411;
        case LEAGUES.BRASILEIRAO:
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
        case LEAGUES.PREMIER:
            return 'http://www.espn.com/soccer/standings/_/league/eng.1';
        case LEAGUES.BRASILEIRAO:
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
    return axios.get(url).then(function (response) {
        var $ = cheerio.load(response.data),
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
                team: team,
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
var getLeagueGames = exports.getLeagueGames = Promise.method(function (league) {
    var daysAhead = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 7;

    // to round up to the nearest day, we can add 1 day and then round down:
    var maxDate = moment().add(daysAhead + 1, 'days').startOf('day');
    var leagueID = leagueToID(league);
    // for now, get data from the hardcoded .csv file
    // TODO: change this and instead fetch live data from the server
    var filepath = './data/spi_matches.csv';
    return fs.readFileAsync(filepath).then(function (csv) {
        return parse(csv, { columns: true });
    }).then(function (output) {
        return output.filter(function (_ref) {
            var league_id = _ref.league_id;
            return parseInt(league_id) === leagueID;
        }) // filter league
        .filter(function (_ref2) {
            var date = _ref2.date;
            // filter date
            var d = moment(date, 'YYYY-MM-DD');
            return d.isAfter(moment()) && d.isBefore(maxDate);
        }).map(function (_ref3) {
            var date = _ref3.date,
                team1 = _ref3.team1,
                team2 = _ref3.team2,
                prob1 = _ref3.prob1,
                prob2 = _ref3.prob2,
                probtie = _ref3.probtie,
                proj_score1 = _ref3.proj_score1,
                proj_score2 = _ref3.proj_score2;

            // keep only relevant properties
            return { date: date, team1: team1, team2: team2, prob1: prob1, prob2: prob2, probtie: probtie, proj_score1: proj_score1, proj_score2: proj_score2 };
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
    return standings.findIndex(function (_ref4) {
        var team = _ref4.team;
        return team === teamA;
    });
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
    return standingsB.reduce(function (acc, _ref5) {
        var team = _ref5.team,
            goalDiff = _ref5.goalDiff,
            points = _ref5.points;

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
 * Generates a single Monte Carlo sample from the games array [games] by the following method:
 *  - Compute a single outcome sample for the first game, resulting in a win, loss, or tie.
 *  - Compute the points each team in the game receives as a result of said outcome, using the scoring function [pts].
 *  - Create a mini set of "standings" for the two teams, based on the point values from the previous step.
 *  - Repeat the above steps for each game, and aggregate all the "standings" into one standings array, and return it.
 *
 * @param {Array} games The array of games to be played. Each game object must have the following properties:
 *  - team1, team2: the names of the two teams.
 *  - prob1, prob2, probtie: the probabilities of team 1 winning, team 2 winning, or a tie (these must sum to 1).
 * @param {Function} pts The scoring function, which must map the numbers 1, 0, and -1 to an array of two integer
 * values. This function should be generated from a league using [pointsFromGame].
 * @returns {Array} The standings from playing each game.
 */
var mcSample = exports.mcSample = function mcSample(games, pts) {
    // MapReduce :D
    var gameResults = games.map(function (_ref6) {
        var team1 = _ref6.team1,
            team2 = _ref6.team2,
            prob1 = _ref6.prob1,
            prob2 = _ref6.prob2,
            probtie = _ref6.probtie;

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

    // add all of the mini standings
    return gameResults.reduce(addStandings, []);
};

/**
 * Creates a Monte Carlo sampler for a specific scoring function: a function that takes a certain number of Monte Carlo
 * samples from an array of games, as above, and returns an array of the sample team standings, with frequencies for
 * each distinct sample. The sampler takes the following parameters:
 *  - [games]: the array of games.
 *  - [N]: the number of samples to take.
 *
 * @param {Function} pts The scoring function; the same as the parameter of the same name in [mcSample].
 * @returns {Function} The sampler function.
 */
var mcSampler = exports.mcSampler = function mcSampler(pts) {
    return Promise.method(function (games, N) {
        var frequencies = [];

        var _loop = function _loop(i) {
            // use the fact that all team names must be different:
            var sample = mcSample(games, pts).sort(function (_ref7, _ref8) {
                var teamA = _ref7.team;
                var teamB = _ref8.team;
                return teamA < teamB ? 1 : -1;
            }),
                frequencyObj = frequencies.find(function (_ref9) {
                var standings = _ref9.standings;

                return standings.every(function (_ref10, i) {
                    var teamA = _ref10.team,
                        goalDiffA = _ref10.goalDiff,
                        pointsA = _ref10.points;
                    var _sample$i = sample[i],
                        teamB = _sample$i.team,
                        goalDiffB = _sample$i.goalDiff,
                        pointsB = _sample$i.points;

                    return teamA === teamB && goalDiffA === goalDiffB && pointsA === pointsB;
                });
            });

            if (typeof frequencyObj === 'undefined') {
                frequencies.push({
                    standings: sample,
                    frequency: 1
                });
            } else {
                frequencyObj.frequency++;
            }
        };

        for (var i = 0; i < N; i++) {
            _loop(i);
        }

        return frequencies;
    });
};