const constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

const Promise = require('bluebird'),
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
const leagueToID = league => {
    switch (league) {
        case LEAGUES.PREMIER:
            return 2411;
        case LEAGUES.BRASILEIRAO:
            return 2105;
    }
};

module.exports.leagueToID = leagueToID;

/**
 * Returns a function that maps wins, losses and ties to points for teams in league [league]. A win is represented by
 * [1], a tie by [0], and a loss by [-1].
 *
 * @param league
 * @returns {function(*)}
 */
module.exports.pointsFromGame = league => {
    // TODO: make this depend on the league
    const win = 3,
        tie = 1,
        loss = 0;

    return result => {
        switch (result) {
            case 1:
                return [win, loss];
            case 0:
                return [tie, tie];
            case -1:
                return [loss, win];
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
const winTieLossSample = (pWin, pTie, pLoss) => {
    const r = Math.random();

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
const leagueToStandingsURL = league => {
    switch (league) {
        case LEAGUES.PREMIER:
            return 'http://www.espn.com/soccer/standings/_/league/eng.1';
        case LEAGUES.BRASILEIRAO:
            return 'http://www.espn.com/soccer/standings/_/league/bra.1';
    }
};

/**
 * Fetches the current league standings for league [league].
 *
 * @param league
 * @returns {Promise}
 */
module.exports.getLeagueStandings = league => {
    const url = leagueToStandingsURL(league);
    return axios.get(url)
        .then(response => {
            const $ = cheerio.load(response.data),
                rows = $('.standings.has-team-logos tbody tr');

            return rows.map(function (i, elem) {
                const tds = $(this).find('td'),
                    teamTd = $(tds[0]),
                    team = $(teamTd).find('span.team-names').text(),
                    goalDiffTd = $(tds[7]),
                    goalDiff = parseInt($(goalDiffTd).text()),
                    pointsTd = $(tds[8]),
                    points = parseInt($(pointsTd).text());
                return {
                    team,
                    goalDiff,
                    points
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
module.exports.getLeagueGames = Promise.method(function (league, daysAhead = 7) {
    // to round up to the nearest day, we can add 1 day and then round down:
    const maxDate = moment().add(daysAhead + 1, 'days').startOf('day');
    if (league in LEAGUES) {
        const leagueID = leagueToID(LEAGUES[league]);
        // for now, get data from the hardcoded .csv file
        // TODO: change this and instead fetch live data from the server
        const filepath = './data/spi_matches.csv';
        return fs.readFileAsync(filepath).then(csv => {
            return parse(csv, {columns: true});
        }).then(output => {
            return output
                .filter(({league_id}) => parseInt(league_id) === leagueID) // filter league
                .filter(({date}) => { // filter date
                    const d = moment(date, 'YYYY-MM-DD');
                    return d.isAfter(moment()) && d.isBefore(maxDate);
                })
                .map(({date, team1, team2, prob1, prob2, probtie, proj_score1, proj_score2}) => {
                    // keep only relevant properties
                    return {date, team1, team2, prob1, prob2, probtie, proj_score1, proj_score2};
                });
        });
    } else {
        throw new TypeError('Invalid league');
    }
});

/**
 * Returns the *index* of the standing of [teamA] in the [standings] array; if there is no such team in [standings] then
 * returns undefined.
 *
 * @param standings
 * @param teamA
 * @returns {number}
 */
const getStandingOfTeam = (standings, teamA) => {
    return standings.findIndex(({team}) => team === teamA);
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
const addStandings = (standingsA, standingsB) => {
    const totalStandings = JSON.parse(JSON.stringify(standingsA)); // deep copy

    // can't spell "functional" without "fun" :)
    return standingsB.reduce((acc, {team, goalDiff, points}) => {
        const standingSoFar = getStandingOfTeam(acc, team);
        if (standingSoFar === -1) {
            // this is a new team, so just append
            // Array.concat shouldn't be worse than O(1) if the second "array" only has one item
            return acc.concat([{team, goalDiff, points}]);
        } else {
            // this team already exists in [standingsA], so we need to alter it
            const {goalDiff: goalDiffSoFar, points: pointsSoFar} = acc[standingSoFar];

            // TODO: make this fully functional (non-mutating) if memory isn't an issue:
            acc[standingSoFar] = {team, goalDiff: goalDiff + goalDiffSoFar, points: points + pointsSoFar};
            return acc;
        }
    }, totalStandings);
};

module.exports.addStandings = addStandings;

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
const mcSample = (games, pts) => {
    // MapReduce :D
    const gameResults = games.map(({team1, team2, prob1, prob2, probtie}) => {
        // TODO: implement goal estimation for goal difference
        const [goals1, goals2] = [0, 0],
            gd = goals1 - goals2,
            // how did team1 do?
            outcome = winTieLossSample(prob1, probtie, prob2),
            [points1, points2] = pts(outcome);

        // return a standings array
        return [
            {
                team: team1,
                goalDiff: gd,
                points: points1
            },
            {
                team: team2,
                goalDiff: -gd,
                points: points2
            }
        ];
    });

    // add all of the mini standings
    return gameResults.reduce(addStandings, []);
};

module.exports.mcSample = mcSample;

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
module.exports.mcSampler = pts => Promise.method((games, N) => {
    const frequencies = [];

    for (let i = 0; i < N; i++) {
        // use the fact that all team names must be different:
        const sample = mcSample(games, pts).sort(({team: teamA}, {team: teamB}) => teamA < teamB),
            frequencyObj = frequencies.find(({standings}) => {
                return standings.every(({team: teamA, goalDiff: goalDiffA, points: pointsA}, i) => {
                    const {team: teamB, goalDiff: goalDiffB, points: pointsB} = sample[i];
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
    }

    return frequencies;
});