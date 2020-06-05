'use strict';

const expect = require('expect.js');

const util = require('../lib/util');

describe('util', function () {
  it('isBasicType should ok', function () {
    expect(util.isBasicType('Model')).to.be(false);
    expect(util.isBasicType('$Request')).to.be(false);
  });
});
