'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert').strict;

const Lexer = require('../lib/lexer');
const { Tag } = require('../lib/tag');
const { Token, Comment, Annotation, StringLiteral, TemplateElement, WordToken, NumberLiteral } = require('../lib/tokens');

function lex(source, filename) {
  var lexer = new Lexer(source, filename);
  var tokens = [];
  var token;
  do {
    token = lexer.scan();
    tokens.push(token);
  } while (token.tag);

  return tokens;
}

function pos(line, column) {
  return { line, column };
}

function loc(startLine, startColumn, endLine, endColumn) {
  return {
    start: pos(startLine, startColumn),
    end: pos(endLine, endColumn)
  };
}

function token(t) {
  return {
    tag: t.tag,
    lexeme: t.lexeme
  };
}

describe('lexer', function () {
  it('should ok', function () {
    assert.deepStrictEqual(lex('', '__filename'), [
      new Token(undefined, loc(1, 1, 1, 1), 0)
    ]);
  });

  it('should ok with comments', function () {
    assert.deepStrictEqual(lex('// abc\n', '__filename'), [
      new Comment('// abc', loc(1, 1, 1, 7), 0),
      new Token(undefined, loc(2, 1, 2, 1), 1)
    ]);
    assert.deepStrictEqual(lex('// abc', '__filename'), [
      new Comment('// abc', loc(1, 1, 1, 7), 0),
      new Token(undefined, loc(1, 7, 1, 7), 1)
    ]);
  });

  it('should ok with Annotation', function () {
    assert.deepStrictEqual(lex('/** abc */', '__filename'), [
      new Annotation('/** abc */', loc(1, 1, 1, 11), 0),
      new Token(undefined, loc(1, 11, 1, 11), 1)
    ]);
    assert.deepStrictEqual(lex('/** abc */\n', '__filename'), [
      new Annotation('/** abc */', loc(1, 1, 1, 11), 0),
      new Token(undefined, loc(2, 1, 2, 1), 1)
    ]);

    assert.deepStrictEqual(lex('/** ab\n * c\n */\n', '__filename'), [
      new Annotation('/** ab\n * c\n */', loc(1, 1, 3, 4), 0),
      new Token(undefined, loc(4, 1, 4, 1), 1)
    ]);

    assert.throws(() => {
      lex('/* abcd */\n', '__filename');
    }, function (e) { // get the exception object
      assert(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, 'Only \'//\' or \'/**\' allowed');
      return true;
    });
  });

  it('should ok with module', function () {
    assert.deepStrictEqual(lex('module {}', '__filename'), [
      new WordToken(Tag.MODULE, 'module', loc(1, 1, 1, 7), 0),
      new Token('{', loc(1, 8, 1, 8), 1),
      new Token('}', loc(1, 9, 1, 9), 2),
      new Token(undefined, loc(1, 10, 1, 10), 3)
    ]);
  });

  it('should ok with string', function () {
    assert.deepStrictEqual(lex('"abcdef"', '__filename'), [
      new StringLiteral('abcdef', loc(1, 2, 1, 8), 0),
      new Token(undefined, loc(1, 9, 1, 9), 1)
    ]);

    assert.deepStrictEqual(lex('\'abcdef\'', '__filename'), [
      new StringLiteral('abcdef', loc(1, 2, 1, 8), 0),
      new Token(undefined, loc(1, 9, 1, 9), 1)
    ]);

    assert.throws(() => {
      lex('\'', '__filename');
    }, function (e) { // get the exception object
      assert(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, 'Unexpect end of file');
      return true;
    });

    assert.throws(() => {
      lex('"', '__filename');
    }, function (e) { // get the exception object
      assert(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, 'Unexpect end of file');
      return true;
    });

    const txt = fs.readFileSync(path.join(__dirname, 'fixtures/escape.txt'), 'utf8');
    assert.deepStrictEqual(lex(txt, '__filename'), [
      new StringLiteral('doesn\'t match.', loc(1, 2, 1, 17), 0),
      new Token(undefined, loc(1, 18, 1, 18), 1)
    ]);

    assert.deepStrictEqual(lex('"\\0\\b\\t\\n\\v\\f\\r\\\'\\\\"', '__filename'), [
      new StringLiteral('\u0000\b\t\n\u000b\f\r\'\\', loc(1, 2, 1, 20), 0),
      new Token(undefined, loc(1, 21, 1, 21), 1)
    ]);

    assert.throws(() => {
      lex('"\\a"', '__filename');
    }, function (e) { // get the exception object
      assert(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, 'Invalid char: \\0xa/\'\\0x97\'');
      return true;
    });
  });

  it('should ok with number', function () {
    assert.deepStrictEqual(lex('123456', '__filename'), [
      new NumberLiteral('123456', 'integer', loc(1, 1, 1, 7), 0),
      new Token(undefined, loc(1, 7, 1, 7), 1)
    ]);

    assert.deepStrictEqual(lex('-1', '__filename'), [
      new NumberLiteral('-1', 'integer', loc(1, 1, 1, 3), 0),
      new Token(undefined, loc(1, 3, 1, 3), 1)
    ]);

    assert.deepStrictEqual(lex('0', '__filename'), [
      new NumberLiteral('0', 'integer', loc(1, 1, 1, 2), 0),
      new Token(undefined, loc(1, 2, 1, 2), 1)
    ]);

    assert.deepStrictEqual(lex('123456L', '__filename'), [
      new NumberLiteral('123456', 'long', loc(1, 1, 1, 8), 0),
      new Token(undefined, loc(1, 8, 1, 8), 1)
    ]);

    assert.deepStrictEqual(lex('1.2345', '__filename'), [
      new NumberLiteral('1.2345', 'float', loc(1, 1, 1, 7), 0),
      new Token(undefined, loc(1, 7, 1, 7), 1)
    ]);

    assert.deepStrictEqual(lex('-1.2345', '__filename'), [
      new NumberLiteral('-1.2345', 'float', loc(1, 1, 1, 8), 0),
      new Token(undefined, loc(1, 8, 1, 8), 1)
    ]);

    assert.deepStrictEqual(lex('1.2345f', '__filename'), [
      new NumberLiteral('1.2345', 'float', loc(1, 1, 1, 8), 0),
      new Token(undefined, loc(1, 8, 1, 8), 1)
    ]);

    assert.deepStrictEqual(lex('1.2345d', '__filename'), [
      new NumberLiteral('1.2345', 'double', loc(1, 1, 1, 8), 0),
      new Token(undefined, loc(1, 8, 1, 8), 1)
    ]);

    assert.deepStrictEqual(lex('0.12345', '__filename'), [
      new NumberLiteral('0.12345', 'float', loc(1, 1, 1, 8), 0),
      new Token(undefined, loc(1, 8, 1, 8), 1)
    ]);

    assert.deepStrictEqual(lex('0.0', '__filename'), [
      new NumberLiteral('0.0', 'float', loc(1, 1, 1, 4), 0),
      new Token(undefined, loc(1, 4, 1, 4), 1)
    ]);

    assert.deepStrictEqual(lex('0', '__filename'), [
      new NumberLiteral('0', 'integer', loc(1, 1, 1, 2), 0),
      new Token(undefined, loc(1, 2, 1, 2), 1)
    ]);
  });

  it('should ok with true/false', function () {
    assert.deepStrictEqual(lex('true', '__filename'), [
      new WordToken(13, 'true', loc(1, 1, 1, 5), 0),
      new Token(undefined, loc(1, 5, 1, 5), 1)
    ]);

    assert.deepStrictEqual(lex('false', '__filename'), [
      new WordToken(13, 'false',loc(1, 1, 1, 6), 0),
      new Token(undefined, loc(1, 6, 1, 6), 1)
    ]);
  });

  it('should ok with virtual prop', function () {
    assert.deepStrictEqual(lex('@prop', '__filename'), [
      new WordToken(3, '@prop', loc(1, 1, 1, 6), 0),
      new Token(undefined, loc(1, 6, 1, 6), 1)
    ]);

    assert.throws(() => {
      lex('@123', '__filename');
    }, function (e) { // get the exception object
      assert(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, 'Unexpect 1 after @');
      return true;
    });
  });

  it('should ok with variable', function () {
    assert.deepStrictEqual(lex('myname', '__filename'), [
      new WordToken(2, 'myname', loc(1, 1, 1, 7), 0),
      new Token(undefined, loc(1, 7, 1, 7), 1)
    ]);
  });

  it('should ok with virtual method', function () {
    assert.deepStrictEqual(lex('@prop()', '__filename'), [
      new WordToken(3, '@prop', loc(1, 1, 1, 6), 0),
      new Token('(', loc(1, 6, 1, 6), 1),
      new Token(')', loc(1, 7, 1, 7), 2),
      new Token(undefined, loc(1, 8, 1, 8), 3)
    ]);
  });

  it('should ok with template', function () {
    assert.deepStrictEqual(lex('`abc${a}def`', '__filename'), [
      new TemplateElement('abc', false, loc(1, 2, 1, 5), 0),
      new WordToken(2, 'a', loc(1, 7, 1, 8), 1),
      new TemplateElement('def', true, loc(1, 9, 1, 12), 2),
      new Token(undefined, loc(1, 13, 1, 13), 3)
    ]);

    assert.deepStrictEqual(lex('`abcdef`', '__filename'), [
      new TemplateElement('abcdef', true, loc(1, 2, 1, 8), 0),
      new Token(undefined, loc(1, 9, 1, 9), 1)
    ]);

    assert.deepStrictEqual(lex('``', '__filename'), [
      new TemplateElement('', true, loc(1, 2, 1, 2), 0),
      new Token(undefined, loc(1, 3, 1, 3), 1)
    ]);

    assert.deepStrictEqual(lex('`$${b}`', '__filename'), [
      new TemplateElement('$', false, loc(1, 2, 1, 3), 0),
      new WordToken(2, 'b', loc(1, 5, 1, 6), 1),
      new TemplateElement('', true, loc(1, 7, 1, 7), 2),
      new Token(undefined, loc(1, 8, 1, 8), 3)
    ]);

    assert.deepStrictEqual(lex('`abc${d}ef${g}h`', '__filename'), [
      new TemplateElement('abc', false, loc(1, 2, 1, 5), 0),
      new WordToken(2, 'd', loc(1, 7, 1, 8), 1),
      new TemplateElement('ef', false, loc(1, 9, 1, 11), 2),
      new WordToken(2, 'g', loc(1, 13, 1, 14), 3),
      new TemplateElement('h', true, loc(1, 15, 1, 16), 4),
      new Token(undefined, loc(1, 17, 1, 17), 5)
    ]);

    assert.deepStrictEqual(lex('`abc${d}ef$gh`', '__filename'), [
      new TemplateElement('abc', false, loc(1, 2, 1, 5), 0),
      new WordToken(2, 'd', loc(1, 7, 1, 8), 1),
      new TemplateElement('ef$gh', true, loc(1, 9, 1, 14), 2),
      new Token(undefined, loc(1, 15, 1, 15), 3)
    ]);

    assert.throws(() => {
      lex('`', '__filename');
    }, function (e) { // get the exception object
      assert(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, 'Unexpect end of file');
      return true;
    });

    assert.throws(() => {
      lex('`abc${d}e', '__filename');
    }, function (e) { // get the exception object
      assert(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, 'Unexpect end of file');
      return true;
    });
  });

  it('type should ok', function () {
    assert.deepStrictEqual(lex('type @default_unit_server = string', '__filename'), [
      new WordToken(2, 'type', loc(1, 1, 1, 5), 0),
      new WordToken(3, '@default_unit_server', loc(1, 6, 1, 26), 1),
      new Token('=', loc(1, 27, 1, 27), 2),
      new WordToken(8, 'string', loc(1, 29, 1, 35), 3),
      new Token(undefined, loc(1, 35, 1, 35), 4)
    ]);

    assert.deepStrictEqual(lex('type @default = (string, string): string', '__filename'), [
      new WordToken(2, 'type', loc(1, 1, 1, 5), 0),
      new WordToken(3, '@default', loc(1, 6, 1, 14), 1),
      new Token('=', loc(1, 15, 1, 15), 2),
      new Token('(', loc(1, 17, 1, 17), 3),
      new WordToken(8, 'string', loc(1, 18, 1, 24), 4),
      new Token(',', loc(1, 24, 1, 24), 5),
      new WordToken(8, 'string', loc(1, 26, 1, 32), 6),
      new Token(')', loc(1, 32, 1, 32), 7),
      new Token(':', loc(1, 33, 1, 33), 8),
      new WordToken(8, 'string', loc(1, 35, 1, 41), 9),
      new Token(undefined, loc(1, 41, 1, 41), 10)
    ]);

    assert.deepStrictEqual(lex('type @default = async (string, string): string', '__filename'), [
      new WordToken(2, 'type', loc(1, 1, 1, 5), 0),
      new WordToken(3, '@default', loc(1, 6, 1, 14), 1),
      new Token('=', loc(1, 15, 1, 15), 2),
      new WordToken(2, 'async', loc(1, 17, 1, 22), 3),
      new Token('(', loc(1, 23, 1, 23), 4),
      new WordToken(8, 'string', loc(1, 24, 1, 30), 5),
      new Token(',', loc(1, 30, 1, 30), 6),
      new WordToken(8, 'string', loc(1, 32, 1, 38), 7),
      new Token(')', loc(1, 38, 1, 38), 8),
      new Token(':', loc(1, 39, 1, 39), 9),
      new WordToken(8, 'string', loc(1, 41, 1, 47), 10),
      new Token(undefined, loc(1, 47, 1, 47), 11)
    ]);

    assert.deepStrictEqual(lex('type @default = [ string ]', '__filename'), [
      new WordToken(2, 'type', loc(1, 1, 1, 5), 0),
      new WordToken(3, '@default', loc(1, 6, 1, 14), 1),
      new Token('=', loc(1, 15, 1, 15), 2),
      new Token('[', loc(1, 17, 1, 17), 3),
      new WordToken(8, 'string', loc(1, 19, 1, 25), 4),
      new Token(']', loc(1, 26, 1, 26), 5),
      new Token(undefined, loc(1, 27, 1, 27), 6)
    ]);
  });

  it('function should ok', function () {
    assert.deepStrictEqual(lex('function', '__filename'), [
      new WordToken(2, 'function', loc(1, 1, 1, 9), 0),
      new Token(undefined, loc(1, 9, 1, 9), 1)
    ]);
  });

  it('null should ok', function () {
    const tokens = lex('null', '__filename');
    assert.deepStrictEqual(tokens.length, 2);
    assert.deepStrictEqual(tokens.map((item) => token(item)), [
      { lexeme: 'null', tag: 14 },
      { lexeme: undefined, tag: undefined }
    ]);
  });

  it('&& should ok', function () {
    const tokens = lex('&&', '__filename');
    assert.deepStrictEqual(tokens.length, 2);
    assert.deepStrictEqual(tokens.map((item) => token(item)), [
      { lexeme: '&&', tag: 26 },
      { lexeme: undefined, tag: undefined }
    ]);
    assert.deepStrictEqual(tokens[0].toString(), 'Logical: `&&`');
  });

  it('& should not ok', function () {
    assert.throws(function () {
      lex('&', '__filename');
    }, (e) => {
      assert(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpect undefined after '&', expect '&'`);
      return true;
    });
  });

  it('|| should ok', function () {
    const tokens = lex('||', '__filename');
    assert.deepStrictEqual(tokens.length, 2);
    assert.deepStrictEqual(tokens.map((item) => token(item)), [
      { lexeme: '||', tag: 26 },
      { lexeme: undefined, tag: undefined }
    ]);
    assert.deepStrictEqual(tokens[0].toString(), 'Logical: `||`');
  });

  it('| should not ok', function () {
    assert.throws(function () {
      lex('|', '__filename');
    }, (e) => {
      assert(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpect undefined after '|', expect '|'`);
      return true;
    });
  });

  it('try/catch/finally shoul ok', function () {
    const tokens = lex(`try {
      } catch (ex) {
      } finally {
      }`, '__filename');
    assert.deepStrictEqual(tokens.map((item) => token(item)), [
      {
        'lexeme': 'try',
        'tag': 28
      },
      {
        lexeme: undefined,
        tag: '{'
      },
      {
        'lexeme': undefined,
        'tag': '}'
      },
      {
        'lexeme': 'catch',
        'tag': 29
      },
      {
        'lexeme': undefined,
        'tag': '('
      },
      {
        'lexeme': 'ex',
        'tag': 2
      },
      {
        'lexeme': undefined,
        'tag': ')'
      },
      {
        'lexeme': undefined,
        'tag': '{'
      },
      {
        'lexeme': undefined,
        'tag': '}'
      },
      {
        'lexeme': 'finally',
        tag: 30
      },
      {
        'lexeme': undefined,
        'tag': '{'
      },
      {
        'lexeme': undefined,
        'tag': '}'
      },
      {
        'lexeme': undefined,
        'tag': undefined,
      }
    ]);
  });

  it('$ID should ok', function () {
    assert.deepStrictEqual(lex('import $ID;', '__filename').map((item) => token(item)), [
      {
        'lexeme': 'import',
        'tag': 22,
      },
      {
        'lexeme': '$ID',
        'tag': 21,
      },
      {
        'lexeme': undefined,
        'tag': ';',
      },
      {
        'lexeme': undefined,
        'tag': undefined,
      }
    ]);

    assert.throws(() => {
      lex('$123', '__filename');
    }, function (e) { // get the exception object
      assert(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, 'Unexpect 1 after $');
      return true;
    });
  });

  it('#ID should ok', function () {
    assert.deepStrictEqual(lex('#append(list, item);', '__filename').map((item) => token(item)), [
      {
        'lexeme': '#append',
        'tag': 36,
      },
      {
        'lexeme': undefined,
        'tag': '(',
      },
      {
        'lexeme': 'list',
        'tag': 2,
      },
      {
        'lexeme': undefined,
        'tag': ',',
      },
      {
        'lexeme': 'item',
        'tag': 2,
      },
      {
        'lexeme': undefined,
        'tag': ')',
      },
      {
        'lexeme': undefined,
        'tag': ';',
      },
      {
        'lexeme': undefined,
        'tag': undefined,
      }
    ]);

    assert.throws(() => {
      lex('#123', '__filename');
    }, function (e) { // get the exception object
      assert(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, 'Unexpect 1 after #');
      return true;
    });
  });
});