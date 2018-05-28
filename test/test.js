'use strict';

const chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    chaiThings = require('chai-things');

chai.use(chaiThings);
chai.use(chaiAsPromised);

const expect = chai.expect;

const {LEAGUES} = require('../src/constants'),
    matchday = require('../src/index'),
    {leagueToID, getLeagueGames, getLeagueStandings, addStandings} = require('../src/util');

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

describe('util', function () {
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
        badLeagueNames.forEach(elem => {
            it(`should reject when given invalid league ${elem}`, function () {
                const result = getLeagueGames(elem);
                return expect(result).to.not.be.fulfilled;
            });
        });

        goodLeagueNames.forEach(elem => {
            it(`should resolve when given valid league ${elem}`, function () {
                const result = getLeagueGames(elem);
                return expect(result).to.be.fulfilled;
            });
        });

        goodLeagueNames.forEach(elem => {
            it(`should resolve with array data when given valid league ${elem}`, function () {
                const result = getLeagueGames(elem);
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
    });
});

describe('matchday', function () {

});