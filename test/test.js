'use strict';

const chai = require('chai'),
    chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const expect = chai.expect;

const {LEAGUES} = require('../src/constants'),
    matchday = require('../src/index'),
    {leagueToID} = require('../src/util'),
    moment = require('moment');

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
        it(`should reject when given invalid league ${elem}`, function () {
            const result = matchday(elem);
            return expect(result).to.not.be.fulfilled;
        });
    });

    const goodLeagueNames = [
        'PREMIER',
        'BRASILEIRAO'
    ];

    goodLeagueNames.forEach(elem => {
        it(`should resolve when given valid league ${elem}`, function () {
            const result = matchday(elem);
            return expect(result).to.be.fulfilled;
        });
    });

    goodLeagueNames.forEach(elem => {
        it(`should resolve with array data when given valid league ${elem}`, function () {
            const result = matchday(elem);
            result.then(data => {
                console.log(data); // for now
            });
            return expect(result).to.eventually.be.an.instanceof(Array);
        });
    });
});