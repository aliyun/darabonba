'use strict';

import expect from 'expect.js';
import * as util from '../lib/util.js';

describe('util', function () {
  it('isBasicType should ok', function () {
    expect(util.isBasicType('Model')).to.be(false);
    expect(util.isBasicType('$Request')).to.be(false);
  });
});
