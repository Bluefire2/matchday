'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var ESPNTeamConversionMap = {
    'Sport': 'Sport Recife',
    'America-MG': 'America Mineiro',
    'Atletico-MG': 'Atletico Mineiro',
    'Atletico-PR': 'Atletico Paranaense',
    'Chapecoense': 'Chapecoense AF'
};

var convertESPNTeam = exports.convertESPNTeam = function convertESPNTeam(team) {
    if (typeof ESPNTeamConversionMap[team] === 'undefined') return team;else return ESPNTeamConversionMap[team];
};