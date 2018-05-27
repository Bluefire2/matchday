'use strict';

const chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    chaiThings = require('chai-things');

chai.use(chaiThings);
chai.use(chaiAsPromised);

const expect = chai.expect;

const {LEAGUES} = require('../src/constants'),
    matchday = require('../src/index'),
    {leagueToID, getGames, getLeagueStandings} = require('../src/util');

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

    describe('getLeagueStandings', function () {
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

    describe('getGames()', function () {
        badLeagueNames.forEach(elem => {
            it(`should reject when given invalid league ${elem}`, function () {
                const result = getGames(elem);
                return expect(result).to.not.be.fulfilled;
            });
        });

        goodLeagueNames.forEach(elem => {
            it(`should resolve when given valid league ${elem}`, function () {
                const result = getGames(elem);
                return expect(result).to.be.fulfilled;
            });
        });

        goodLeagueNames.forEach(elem => {
            it(`should resolve with array data when given valid league ${elem}`, function () {
                const result = getGames(elem);
                result.then(data => {
                    // console.log(data); // for now
                });
                return expect(result).to.eventually.be.an.instanceof(Array);
            });
        });
    });
});

describe('matchday', function () {

});