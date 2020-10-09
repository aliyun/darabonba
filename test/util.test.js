'use strict';

const assert = require('assert');

const util = require('../lib/util');

describe('util', function () {
  it('isBasicType should ok', function () {
    assert.equal(util.isBasicType('Model'), false);
    assert.equal(util.isBasicType('$Request'), false);
  });

  it('isInteger should ok', function () {
    assert.equal(util.isInteger('integer'), true);
    assert.equal(util.isInteger('string'), false);
  });
});
