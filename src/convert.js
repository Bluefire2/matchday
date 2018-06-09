const ESPNTeamConversionMap = {
    'Sport': 'Sport Recife',
    'America-MG': 'America Mineiro',
    'Atletico-MG': 'Atletico Mineiro',
    'Atletico-PR': 'Atletico Paranaense',
    'Chapecoense': 'Chapecoense AF'
};

export const convertESPNTeam = team => {
    if (typeof ESPNTeamConversionMap[team] === 'undefined') return team;
    else return ESPNTeamConversionMap[team];
};