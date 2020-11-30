'use strict';

const assert = require('assert');

const Env = require('../lib/env');

describe('env', function () {
  it('get ok', function () {
    var env = new Env();
    env.set('a', 'a1');
    assert.deepStrictEqual(env.get('a'), 'a1');
    var env1 = new Env(env);
    assert.deepStrictEqual(env1.get('a'), 'a1');
    assert.deepStrictEqual(env1.get('b'), null);
  });

  it('hasDefined ok', function () {
    var env = new Env();
    env.set('a', 'a1');
    assert.deepStrictEqual(env.hasDefined('a'), true);
    var env1 = new Env(env);
    assert.deepStrictEqual(env1.hasDefined('a'), true);
    assert.deepStrictEqual(env1.hasDefined('b'), false);
  });
});
