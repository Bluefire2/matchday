'use strict';

var expect = require('chai').expect;
var returnFour = require('../src/index');

describe('#numFormatter', function() {
    it('should always return four', function() {
        var result = returnFour();
        expect(result).to.equal(4);
    });
});