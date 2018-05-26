const constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

/**
 * Gives the SPI league id for [league].
 *
 * @param league
 * @returns {number}
 */
module.exports.leagueToID = league => {
    switch (league) {
        case LEAGUES.PREMIER:
            return 2411;
        case LEAGUES.BRASILEIRAO:
            return 2105
    }
};