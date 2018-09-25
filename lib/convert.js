'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
// TODO: extract this into a file
var ESPNTeamConversionMap = {
    'Sport': 'Sport Recife',
    'America-MG': 'America Mineiro',
    'Atletico-MG': 'Atletico Mineiro',
    'Atletico-PR': 'Atletico Paranaense',
    'Chapecoense': 'Chapecoense AF',
    'Newcastle United': 'Newcastle',
    'Wolverhampton Wanderers': 'Wolverhampton',
    'Brighton & Hove Albion': 'Brighton and Hove Albion'
};

var convertESPNTeam = exports.convertESPNTeam = function convertESPNTeam(team) {
    if (typeof ESPNTeamConversionMap[team] === 'undefined') return team;else return ESPNTeamConversionMap[team];
};