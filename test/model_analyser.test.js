'use strict';
const assert = require('assert');

const Analyser = require('../lib/model_analyser');
const Parser = require('../lib/parser');
const Lexer = require('../lib/lexer');
const Package = require('../lib/package');

function parse(source, pkg = new Package()) {
  const lexer = new Lexer(source, '__filename');
  const parser = new Parser(lexer);
  const ast = parser.program();
  const anlyser = new Analyser({ source, filename: '__filename' }, pkg);
  anlyser.check(ast);
  return ast;
}

describe('model analyser', function () {
  it('redefined field in model should not ok', async function () {
    assert.throws(function () {
      parse(`
        model M {
          a: string,
          a: string
        }`);
    }, function (e) {
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `redefined field "a" in model "M"`);
      return true;
    });
  });

  it('undefined type in model should not ok', function () {
    assert.throws(function () {
      parse(`
        model M {
          a: json
        }`);
    }, function (e) {
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `the type 'json' is undefined`);
      return true;
    });

    assert.throws(function () {
      parse(`
        model M {
          a: [ json ]
        }`);
    }, function (e) {
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `the type 'json' is undefined`);
      return true;
    });
  });

  it('another model should ok', function () {
    const pkg = new Package();
    const lexer = new Lexer(`model N {}`, '__filename');
    const parser = new Parser(lexer);
    const ast = parser.program();
    pkg.components.set('N', {
      type: 'model',
      ast,
      ctx: {
        source: lexer.source,
        filename: lexer.filename
      }
    });
    parse(`
      model M {
        field: N
      }`, pkg);
  });

  it('used types should ok', function () {
    const ast = parse(`
      model M {
        r: readable
      }`);
    assert.deepStrictEqual(ast.usedTypes.has('readable'), true);
    assert.deepStrictEqual(ast.usedTypes.has('writable'), false);
  });

  it('types should ok', function () {
    parse(`
      model M {
        intNum: integer,
        int8Num: int8,
        uint8Num: uint8,
        int16Num: int16,
        uint16Num: uint16,
        int32Num: int32,
        uint32Num: uint32,
        int64Num: int64,
        uint64Num: uint64,
        longNum: long,
        ulongNum: ulong,
        floatNum: float,
        doubleNum: double,
        intArr: [ integer ],
        int8Arr: [ int8 ],
        longArr: [ long ],
        floatArr: [ float ],
        intMap: map[string] integer,
        int8Map: map[string] int8,
        longMap: map[string] long,
        floatMap: map[string] float,
      }`);
  });

  it('import undefined package should not ok', function () {
    assert.throws(() => {
      parse(`import $std; model M {}`);
    }, (e) => {
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `the package '$std' not defined in Darafile`);
      return true;
    });
  });

  it('re-import package should not ok', function () {
    assert.throws(() => {
      const pkg = new Package();
      pkg.libraries.set('$std', new Package());
      parse(`import $std; import $std; model M {}`, pkg);
    }, (e) => {
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `the package id '$std' has been imported`);
      return true;
    });
  });

  it('un-import package should not ok', function () {
    assert.throws(() => {
      parse(`
      model M {
        extern: $std.M
      }`);
    }, (e) => {
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `the package '$std' is un-imported`);
      return true;
    });
  });

  it('undefined extern model should not ok', function () {
    assert.throws(() => {
      const pkg = new Package();
      pkg.libraries.set('$std', new Package());
      parse(`
      import $std;
      model M {
        extern: $std.M
      }`, pkg);
    }, (e) => {
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `'M' is undefined in '$std'`);
      return true;
    });
  });

  it('extern model should ok', function () {
    const pkg = new Package();
    const $std = new Package();
    const lexer = new Lexer(`model M {}`, '__filename');
    const parser = new Parser(lexer);
    const ast = parser.program();
    $std.components.set('M', {
      type: 'model',
      ast,
      ctx: {
        source: lexer.source,
        filename: lexer.filename
      }
    });
    pkg.libraries.set('$std', $std);
    parse(`
      import $std;
      model M {
        extern: $std.M
      }`, pkg);
  });
});
