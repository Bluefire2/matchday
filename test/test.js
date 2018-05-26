'use strict';

const expect = require('chai').expect,
    matchday = require('../src/index');

describe('#matchday', function() {
    const badLeagueNames = [
        'LIGUE 1',
        'SERIE A',
        'premier',
        'abcdef',
        'hello world'
    ];

    badLeagueNames.forEach(elem => {
        it(`should return an empty object when given invalid league ${elem}`, function() {
            const result = matchday(elem);
            expect(result).to.deep.equal({});
        });
    });
});