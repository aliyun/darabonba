'use strict';

const assert = require('assert');

const BaseLexer = require('../lib/base_lexer');
const Keyword = require('../lib/keyword');

describe('base lexer', function () {
  it('base lexer should ok', function () {
    const lexer = new BaseLexer(`source`, '__filename');
    lexer.getch();
    assert.deepStrictEqual(lexer.peek, 's');
    lexer.getch();
    assert.deepStrictEqual(lexer.peek, 'o');
    lexer.ungetch();
    assert.deepStrictEqual(lexer.peek, 's');
  });

  it('loc should ok', function () {
    const lexer = new BaseLexer(`key\nwords whitespace`, '__filename');
    lexer.getch();
    assert.deepStrictEqual(lexer.peek, 'k');
    assert.deepStrictEqual(lexer.line, 1);
    assert.deepStrictEqual(lexer.column, 1);
    lexer.getch();
    assert.deepStrictEqual(lexer.peek, 'e');
    assert.deepStrictEqual(lexer.line, 1);
    assert.deepStrictEqual(lexer.column, 2);
    lexer.getch();
    assert.deepStrictEqual(lexer.peek, 'y');
    assert.deepStrictEqual(lexer.line, 1);
    assert.deepStrictEqual(lexer.column, 3);
    lexer.getch();
    assert.deepStrictEqual(lexer.peek, '\n');
    assert.deepStrictEqual(lexer.line, 1);
    assert.deepStrictEqual(lexer.column, 4);
    lexer.getch();
    assert.deepStrictEqual(lexer.peek, 'w');
    assert.deepStrictEqual(lexer.line, 2);
    assert.deepStrictEqual(lexer.column, 1);
  });

  it('duplicate reserved word should not ok', function () {
    assert.throws(() => {
      const lexer = new BaseLexer(`source`, '__filename');
      lexer.reserve(new Keyword('keyword', 1));
      lexer.reserve(new Keyword('keyword', 1));
    }, (ex) => {
      assert.deepStrictEqual(ex.message, 'duplicate reserved word: keyword');
      return true;
    });
  });
});