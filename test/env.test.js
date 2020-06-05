'use strict';

const expect = require('expect.js');

const Env = require('../lib/env');

describe('env', function () {
  it('get ok', function () {
    var env = new Env();
    env.set('a', 'a1');
    expect(env.get('a')).to.be('a1');
    var env1 = new Env(env);
    expect(env1.get('a')).to.be('a1');
    expect(env1.get('b')).to.be(null);
  });

  it('hasDefined ok', function () {
    var env = new Env();
    env.set('a', 'a1');
    expect(env.hasDefined('a')).to.be(true);
    var env1 = new Env(env);
    expect(env1.hasDefined('a')).to.be(true);
    expect(env1.hasDefined('b')).to.be(false);
  });
});
