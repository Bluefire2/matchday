'use strict';

const constants = require('./constants'),
    LEAGUES = constants.LEAGUES;

/**
 * Fetch the following:
 *  - The match data for all teams in [league] for the next [daysAhead] days
 *  - The current standings of the league
 * and wrap it in a promise.
 * @param league
 * @param daysAhead
 */
module.exports = (league, daysAhead = 7) => {
    // empty for now
};