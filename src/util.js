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
 * Returns a function that maps wins, losses and ties to points for a team in league [league]. A win is represented by
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
                return win;
            case 0:
                return tie;
            case -1:
                return loss;
        }
    };
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
 * Returns the standing of [teamA] in the [standings] array; if there is no such team in [standings] then returns
 * undefined.
 *
 * @param standings
 * @param teamA
 * @returns {Object}
 */
const getStandingOfTeam = (standings, teamA) => {
    return standings.find(({team}) => team === teamA);
};

/**
 * Adds two sets of team standings together. For each team, adds the goal difference and points. Returns the new
 * standings array.
 *
 * Preconditions:
 *  - [standingsA] and [standingsB] must be proper standings objects
 *  - Each team that exists in [standingsA] must also exist in [standingsB], and vice versa
 *
 * @param standingsA
 * @param standingsB
 * @returns {Array}
 */
module.exports.addStandings = (standingsA, standingsB) => {
    return standingsA.map(({team, goalDiff, points}) => {
        const {goalDiff: addGoalDiff, points: addPoints} = getStandingOfTeam(standingsB, team);
        return {
            team,
            goalDiff: goalDiff + addGoalDiff,
            points: points + addPoints
        };
    });
};