'use strict';

const expect = require('chai').expect,
    matchday = require('../src/index');

describe('#matchday', function() {
    it('should return an empty object when given an invalid league', function() {
        const badLeagueNames = [
            'LIGUE 1',
            'SERIE A',
            'premier',
            'abcdef',
            'hello world'
        ];

        badLeagueNames.forEach(elem => {
            const result = matchday(elem);
            expect(result).to.deep.equal({});
        });
    });
});