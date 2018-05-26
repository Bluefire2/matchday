'use strict';

const constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

/**
 * Fetch the following:
 *  - The match data for all teams in [league] for the next [daysAhead] days
 *  - The current standings of the league
 * @param league
 * @param daysAhead
 */
module.exports = (league, daysAhead) => {
    if(league in LEAGUES) {
        // do stuff
    } else {
        return {};
    }
};