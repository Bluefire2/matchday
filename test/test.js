'use strict';

const chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    chaiThings = require('chai-things');

chai.use(chaiThings);
chai.use(chaiAsPromised);

const expect = chai.expect;

const {LEAGUES} = require('../src/constants'),
    matchday = require('../src/index'),
    {leagueToID, getLeagueGames, getLeagueStandings, addStandings, pointsFromGame, mcSample, mcSampler} = require('../src/util');


const util = require('util'),
    Promise = require('bluebird');

describe('util', function () {
    const goodLeagueNames = [
        'PREMIER',
        'BRASILEIRAO'
    ];

    const badLeagueNames = [
        'LIGUE 1',
        'SERIE A',
        'premier',
        'abcdef',
        'hello world'
    ];

    describe('leagueToID()', function () {
        const leagueToIDTests = [
            {args: [LEAGUES['PREMIER']], expected: 2411},
            {args: [LEAGUES['BRASILEIRAO']], expected: 2105}
        ];
        leagueToIDTests.forEach(({args, expected}) => {
            it(`should give the correct ID for league ${args[0]}`, function () {
                const result = leagueToID.apply(null, args);
                expect(result).to.equal(expected)
            });
        });
    });

    describe('getLeagueStandings()', function () {
        goodLeagueNames.forEach(elem => {
            it(`should resolve with a nonempty array when given valid league ${elem}`, function () {
                const standings = getLeagueStandings(LEAGUES[elem]);
                expect(standings).to.eventually.be.an.instanceOf(Array);
                expect(standings).to.eventually.have.length.above(0);
            });
        });

        goodLeagueNames.forEach(elem => {
            it(`should resolve with an array of objects with valid [team], [goalDiff] and 
                [points] properties when given valid league ${elem}`, function (done) {
                const standings = getLeagueStandings(LEAGUES[elem]);
                standings.then(data => {
                    data.forEach(datum => {
                        expect(datum).to.contain.keys('team', 'goalDiff', 'points');
                        expect(datum.team).to.be.a('string');
                        expect(datum.goalDiff).to.be.a('number');
                        expect(datum.points).to.be.a('number');
                        expect(datum.points).to.be.above(-1);
                    });
                    done();
                });
            });
        });
    });

    describe('getLeagueGames()', function () {
        goodLeagueNames.forEach(elem => {
            it(`should resolve when given valid league ${elem}`, function () {
                const result = getLeagueGames(LEAGUES[elem]);
                return expect(result).to.be.fulfilled;
            });
        });

        goodLeagueNames.forEach(elem => {
            it(`should resolve with array data when given valid league ${elem}`, function () {
                const result = getLeagueGames(LEAGUES[elem]);
                result.then(data => {
                    // console.log(data); // for now
                });
                return expect(result).to.eventually.be.an.instanceOf(Array);
            });
        });
    });

    describe('addStandings()', function () {
        it('should produce an empty array when adding empty standings', function () {
            const result = addStandings([], []);
            expect(result).to.be.an.instanceOf(Array).with.lengthOf(0);
        });

        it('should correctly add arrays of a single standing', function () {
            const standingA = {
                team: 'Hello World!',
                goalDiff: -5,
                points: 10
            };
            const standingB = {
                team: 'Hello World!',
                goalDiff: 17,
                points: 29
            };

            const result = addStandings([standingA], [standingB]);
            expect(result).to.be.an.instanceOf(Array).with.lengthOf(1);

            const first = result[0];
            expect(first.team).to.be.equal("Hello World!");
            expect(first.goalDiff).to.be.equal(12);
            expect(first.points).to.be.equal(39);
        });

        it('should correctly add arrays of four standings, in arbitrary order', function () {
            const standingsA = [
                {
                    team: 'Manchester City',
                    goalDiff: 50,
                    points: 67
                },
                {
                    team: 'Manchester United',
                    goalDiff: 58,
                    points: 62
                },
                {
                    team: 'Liverpool',
                    goalDiff: -23,
                    points: 87
                },
                {
                    team: 'Chelsea',
                    goalDiff: -85,
                    points: 15
                }
            ];
            const standingsB = [
                {
                    team: 'Liverpool',
                    goalDiff: -7,
                    points: 20
                },
                {
                    team: 'Manchester United',
                    goalDiff: 5,
                    points: 55
                },
                {
                    team: 'Chelsea',
                    goalDiff: 0,
                    points: 10
                },
                {
                    team: 'Manchester City',
                    goalDiff: -5,
                    points: 11
                }
            ];

            const result = addStandings(standingsA, standingsB);
            expect(result).to.be.an.instanceOf(Array).with.lengthOf(4);

            // TODO: check each team
        });

        it('should add uneven arrays of standings', function () {
            const unevenA = [{team: 'Manchester United', goalDiff: 0, points: 3},
                {team: 'Manchester City', goalDiff: 0, points: 3},
                {team: 'Liverpool', goalDiff: -0, points: 0}];

            const unevenB = [{team: 'Chelsea', goalDiff: 0, points: 3},
                {team: 'Liverpool', goalDiff: -0, points: 0}];

            const teamNames = ['Manchester City', 'Manchester United', 'Liverpool',
                'Chelsea'];

            const result = addStandings(unevenA, unevenB);

            expect(result).to.be.an.instanceOf(Array).with.lengthOf(4);

            teamNames.forEach(teamA => {
                expect(result).to.satisfy(r => r.some(({team}) => team === teamA));
            });
        });
    });

    describe('mcSample()', function () {
        const scoring = pointsFromGame('PREMIER');

        it('should give an empty array if there are no games to be played', function () {
            const result = mcSample([], scoring);
            expect(result).to.be.an.instanceOf(Array).with.lengthOf(0);
        });

        const oneGameWithCertainWin = [
                {
                    team1: 'Manchester City',
                    team2: 'Manchester United',
                    prob1: 1,
                    prob2: 0,
                    probtie: 0
                }
            ],
            oneGameWithCertainTie = [
                {
                    team1: 'Manchester City',
                    team2: 'Manchester United',
                    prob1: 0,
                    prob2: 0,
                    probtie: 1
                }
            ],
            oneGameWithCertainLoss = [
                {
                    team1: 'Manchester City',
                    team2: 'Manchester United',
                    prob1: 0,
                    prob2: 1,
                    probtie: 0
                }
            ];

        it('should give a standing with team1 on top when team1 is guaranteed to win the only game', function () {
            const result = mcSample(oneGameWithCertainWin, scoring);
            expect(result).to.be.an.instanceOf(Array).with.lengthOf(2);

            const cityPts = result.find(({team}) => team === 'Manchester City').points,
                unitedPts = result.find(({team}) => team === 'Manchester United').points;

            expect(cityPts).to.be.above(unitedPts);
        });

        it('should give a standing with team2 on top when team2 is guaranteed to win the only game', function () {
            const result = mcSample(oneGameWithCertainLoss, scoring);
            expect(result).to.be.an.instanceOf(Array).with.lengthOf(2);

            const cityPts = result.find(({team}) => team === 'Manchester City').points,
                unitedPts = result.find(({team}) => team === 'Manchester United').points;

            expect(cityPts).to.be.below(unitedPts);
        });

        it('should give a standing with team1 and team2 equal when the only game is guaranteed to be tied', function () {
            const result = mcSample(oneGameWithCertainTie, scoring);
            expect(result).to.be.an.instanceOf(Array).with.lengthOf(2);

            const cityPts = result.find(({team}) => team === 'Manchester City').points,
                unitedPts = result.find(({team}) => team === 'Manchester United').points;

            expect(cityPts).to.be.equal(unitedPts);
        });

        const someGames = [
            {
                team1: 'Manchester United',
                team2: 'Manchester City',
                prob1: 0.4,
                prob2: 0.4,
                probtie: 0.2
            },
            {
                team1: 'Manchester City',
                team2: 'Liverpool',
                prob1: 0.5,
                prob2: 0.3,
                probtie: 0.2
            },
            {
                team1: 'Chelsea',
                team2: 'Liverpool',
                prob1: 0.3,
                prob2: 0.4,
                probtie: 0.3
            },
            {
                team1: 'Manchester United',
                team2: 'Crystal Palace',
                prob1: 0.8,
                prob2: 0.05,
                probtie: 0.15
            },
            {
                team1: 'Newcastle United',
                team2: 'Manchester City',
                prob1: 0.1,
                prob2: 0.7,
                probtie: 0.2
            }
        ];

        const someTeamNames = ['Manchester City', 'Manchester United', 'Liverpool',
            'Chelsea', 'Crystal Palace', 'Newcastle United'];

        it('should preserve team names when run on a list of games', function () {
            const result = mcSample(someGames, scoring);

            expect(someTeamNames).to.all.satisfy(teamA => result.some(({team}) => team === teamA));
        });
    });

    describe('mcSampler()', function () {
        const scoring = pointsFromGame('PREMIER'),
            sampler = mcSampler(scoring);

        const someGames = [
            {
                team1: 'Manchester United',
                team2: 'Manchester City',
                prob1: 0.4,
                prob2: 0.4,
                probtie: 0.2
            },
            {
                team1: 'Manchester City',
                team2: 'Liverpool',
                prob1: 0.5,
                prob2: 0.3,
                probtie: 0.2
            },
            {
                team1: 'Chelsea',
                team2: 'Liverpool',
                prob1: 0.3,
                prob2: 0.4,
                probtie: 0.3
            },
            {
                team1: 'Manchester United',
                team2: 'Crystal Palace',
                prob1: 0.8,
                prob2: 0.05,
                probtie: 0.15
            },
            {
                team1: 'Newcastle United',
                team2: 'Manchester City',
                prob1: 0.1,
                prob2: 0.7,
                probtie: 0.2
            }
        ];

        const threeGamesWithCertainWin = [
            {
                team1: 'Manchester City',
                team2: 'Manchester United',
                prob1: 1,
                prob2: 0,
                probtie: 0
            },
            {
                team1: 'Manchester City',
                team2: 'Newcastle United',
                prob1: 1,
                prob2: 0,
                probtie: 0
            },
            {
                team1: 'Manchester United',
                team2: 'Newcastle United',
                prob1: 1,
                prob2: 0,
                probtie: 0
            },
        ];

        it('should identify all outcomes as equal if there is only one outcome', function (done) {
            const samples = sampler(threeGamesWithCertainWin, 100);
            samples.then(s => {
                // console.log(util.inspect(s, {showHidden: false, depth: null}));
                expect(s).to.be.an.instanceOf(Array).with.lengthOf(1);
                expect(s[0].frequency).to.equal(100);
                done();
            });
        });

        const testN = 10000;
        it(`should generate between 1 and ${testN} cases when N = ${testN}`, function (done) {
            const samples = sampler(someGames, testN);
            samples.then(s => {
                // console.log(util.inspect(s, {showHidden: false, depth: null}));
                expect(s).to.be.an.instanceOf(Array).with.lengthOf.within(1, testN);
                done();
            });
        });

        it(`should generate cases whose frequencies add up to ${testN} when N = ${testN}`, function (done) {
            const samples = sampler(someGames, testN);
            samples.then(s => {
                const sumFrequencies = s.reduce((acc, elem) => acc + elem.frequency, 0);
                expect(sumFrequencies).to.equal(testN);
                done();
            });
        });
    });
});

describe('matchday', function () {
    it('should work :)', function (done) {
        // TODO: write some actual tests...
        const p = matchday('BRASILEIRAO', 1, 1000);
        p.then(data => {
            // console.log(util.inspect(data, {showHidden: false, depth: null}));
            done();
        });
    });
});