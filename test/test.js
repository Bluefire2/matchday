'use strict';

const {LEAGUES} = require('../src/constants');

const expect = require('chai').expect,
    matchday = require('../src/index'),
    {leagueToID} = require('../src/util');

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
});

describe('matchday', function () {
    const badLeagueNames = [
        'LIGUE 1',
        'SERIE A',
        'premier',
        'abcdef',
        'hello world'
    ];

    badLeagueNames.forEach(elem => {
        it(`should return an empty object when given invalid league ${elem}`, function () {
            const result = matchday(elem);
            expect(result).to.deep.equal({});
        });
    });
});