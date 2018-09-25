// TODO: extract this into a file
const ESPNTeamConversionMap = {
    'Sport': 'Sport Recife',
    'America-MG': 'America Mineiro',
    'Atletico-MG': 'Atletico Mineiro',
    'Atletico-PR': 'Atletico Paranaense',
    'Chapecoense': 'Chapecoense AF',
    'Newcastle United': 'Newcastle',
    'Wolverhampton Wanderers': 'Wolverhampton',
    'Brighton & Hove Albion': 'Brighton and Hove Albion'
};

export const convertESPNTeam = team => {
    if (typeof ESPNTeamConversionMap[team] === 'undefined') return team;
    else return ESPNTeamConversionMap[team];
};