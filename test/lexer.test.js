'use strict';

const fs = require('fs');
const path = require('path');

const expect = require('expect.js');

const Lexer = require('../lib/lexer');

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
    expect(lex('', '__filename')).to.be.eql([
      {
        tag: undefined,
        'loc': loc(1, 1, 1, 1)
      }
    ]);
  });

  it('should ok with comments', function () {
    expect(lex('// abc\n', '__filename')).to.be.eql([
      {
        tag: 20,
        value: '// abc',
        'loc': loc(1, 1, 1, 7)
      },
      { tag: undefined, 'loc': loc(2, 1, 2, 1) }
    ]);
    expect(lex('// abc', '__filename')).to.be.eql([
      {
        tag: 20,
        value: '// abc',
        'loc': loc(1, 1, 1, 7)
      },
      { tag: undefined, 'loc': loc(1, 7, 1, 7) }
    ]);
  });

  it('should ok with Annotation', function () {
    expect(lex('/** abc */', '__filename')).to.be.eql([
      {
        tag: 19,
        value: '/** abc */',
        'loc': loc(1, 1, 1, 11)
      },
      { tag: undefined, 'loc': loc(1, 11, 1, 11) }
    ]);
    expect(lex('/** abc */\n', '__filename')).to.be.eql([
      {
        tag: 19,
        value: '/** abc */',
        'loc': loc(1, 1, 1, 11)
      },
      { tag: undefined, 'loc': loc(2, 1, 2, 1) }
    ]);

    expect(lex('/** ab\n * c\n */\n', '__filename')).to.be.eql([
      {
        tag: 19,
        value: '/** ab\n * c\n */',
        'loc': loc(1, 1, 3, 4)
      },
      { tag: undefined, 'loc': loc(4, 1, 4, 1) }
    ]);

    expect(() => {
      lex('/* abcd */\n', '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('Only \'//\' or \'/**\' allowed');
    });
  });

  it('should ok with module', function () {
    expect(lex('module {}', '__filename')).to.be.eql([
      {
        tag: 2,
        lexeme: 'module',
        'loc': loc(1, 1, 1, 7)
      },
      { tag: '{', loc: loc(1, 8, 1, 8) },
      { tag: '}', loc: loc(1, 9, 1, 9) },
      { tag: undefined, loc: loc(1, 10, 1, 10) }
    ]);
  });

  it('should ok with string', function () {
    expect(lex('"abcdef"', '__filename')).to.be.eql([
      { tag: 1, string: 'abcdef',
        'loc': loc(1, 2, 1, 8)},
      { tag: undefined, loc: loc(1, 9, 1, 9) }
    ]);

    expect(lex('\'abcdef\'', '__filename')).to.be.eql([
      { tag: 1, string: 'abcdef', loc: loc(1, 2, 1, 8) },
      { tag: undefined, loc: loc(1, 9, 1, 9) }
    ]);

    expect(() => {
      lex('\'', '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('Unexpect end of file');
    });

    expect(() => {
      lex('"', '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('Unexpect end of file');
    });

    const txt = fs.readFileSync(path.join(__dirname, 'fixtures/escape.txt'), 'utf8');
    expect(lex(txt, '__filename')).to.be.eql([
      { tag: 1, string: 'doesn\'t match.',
        'loc': loc(1, 2, 1, 17)
      },
      {
        tag: 1, string: '"also can match"',
        'loc': loc(2, 2, 2, 20)
      },
      { tag: undefined,
        loc: loc(2, 21, 2, 21)
      }
    ]);

    expect(lex('"\\0\\b\\t\\n\\v\\f\\r\\\'\\\\"', '__filename')).to.be.eql([
      { tag: 1, string: '\u0000\b\t\n\u000b\f\r\'\\',
        'loc': loc(1, 2, 1, 20)
      },
      { tag: undefined,
        loc: loc(1, 21, 1, 21)
      }
    ]);

    expect(() => {
      lex('"\\a"', '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('Invalid char: \\0xa/\'\\0x97\'');
    });
  });

  it('should ok with number', function () {
    expect(lex('123456', '__filename')).to.be.eql([
      { tag: 9, value: 123456, type: 'integer',
        'loc': loc(1, 1, 1, 7) },
      { tag: undefined, loc: loc(1, 7, 1, 7) }
    ]);

    expect(lex('-1', '__filename')).to.be.eql([
      { tag: 9, value: -1, type: 'integer',
        'loc': loc(1, 1, 1, 3) },
      { tag: undefined, loc: loc(1, 3, 1, 3) }
    ]);

    expect(lex('0', '__filename')).to.be.eql([
      { tag: 9, value: 0, type: 'integer',
        'loc': loc(1, 1, 1, 2)
      },
      { tag: undefined, loc: loc(1, 2, 1, 2) }
    ]);

    expect(lex('123456L', '__filename')).to.be.eql([
      {
        tag: 9, value: 123456, type: 'long',
        'loc': loc(1, 1, 1, 8)
      },
      { tag: undefined, loc: loc(1, 8, 1, 8) }
    ]);

    expect(lex('1.2345', '__filename')).to.be.eql([
      {
        tag: 9, value: 1.2345, type: 'float',
        'loc': loc(1, 1, 1, 7)
      },
      { tag: undefined, loc: loc(1, 7, 1, 7) }
    ]);

    expect(lex('-1.2345', '__filename')).to.be.eql([
      {
        tag: 9, value: -1.2345, type: 'float',
        'loc': loc(1, 1, 1, 8)
      },
      { tag: undefined, loc: loc(1, 8, 1, 8) }
    ]);

    expect(lex('1.2345f', '__filename')).to.be.eql([
      {
        tag: 9, value: 1.2345, type: 'float',
        'loc': loc(1, 1, 1, 8)
      },
      { tag: undefined, loc: loc(1, 8, 1, 8) }
    ]);


    expect(lex('1.2345d', '__filename')).to.be.eql([
      {
        tag: 9, value: 1.2345, type: 'double',
        'loc': loc(1, 1, 1, 8)
      },
      { tag: undefined, loc: loc(1, 8, 1, 8) }
    ]);

    expect(lex('0.12345', '__filename')).to.be.eql([
      {
        tag: 9, value: 0.12345, type: 'float',
        'loc': loc(1, 1, 1, 8)
      },
      { tag: undefined, loc: loc(1, 8, 1, 8) }
    ]);

    expect(lex('0.0', '__filename')).to.be.eql([
      {
        tag: 9, value: 0.0, type: 'float',
        'loc': loc(1, 1, 1, 4)
      },
      { tag: undefined, loc: loc(1, 4, 1, 4) }
    ]);

    expect(lex('0', '__filename')).to.be.eql([
      {
        tag: 9, value: 0, type: 'integer',
        'loc': loc(1, 1, 1, 2)
      },
      { tag: undefined, loc: loc(1, 2, 1, 2) }
    ]);
  });

  it('should ok with true/false', function () {
    expect(lex('true', '__filename')).to.be.eql([
      {
        lexeme: 'true',
        tag: 13,
        'loc': loc(1, 1, 1, 5)
      },
      { tag: undefined, loc: loc(1, 5, 1, 5) }
    ]);

    expect(lex('false', '__filename')).to.be.eql([
      {lexeme: 'false', tag: 13,         'loc': loc(1, 1, 1, 6)},
      { tag: undefined, loc: loc(1, 6, 1, 6) }
    ]);
  });

  it('should ok with virtual prop', function () {
    expect(lex('@prop', '__filename')).to.be.eql([
      { tag: 3, lexeme: '@prop',
        'loc': loc(1, 1, 1, 6) },
      { tag: undefined, loc: loc(1, 6, 1, 6) }
    ]);

    expect(() => {
      lex('@123', '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('Unexpect 1 after @');
    });
  });

  it('should ok with variable', function () {
    expect(lex('myname', '__filename')).to.be.eql([
      { tag: 2, lexeme: 'myname',
        'loc': loc(1, 1, 1, 7) },
      { tag: undefined, loc: loc(1, 7, 1, 7) }
    ]);
  });

  it('should ok with virtual method', function () {
    expect(lex('@prop()', '__filename')).to.be.eql([
      { tag: 3, lexeme: '@prop',
        'loc': loc(1, 1, 1, 6)
      },
      { tag: '(',
        'loc': loc(1, 6, 1, 6) },
      { tag: ')',
        'loc': loc(1, 7, 1, 7) },
      { tag: undefined, loc: loc(1, 8, 1, 8) }
    ]);
  });

  it('should ok with template', function () {
    expect(lex('`abc${a}def`', '__filename')).to.be.eql([
      {
        tag: 12, string: 'abc', tail: false,
        'loc': loc(1, 2, 1, 5)
      },
      { tag: 2, lexeme: 'a',
        'loc': loc(1, 7, 1, 8)
      },
      { tag: 12, string: 'def', tail: true, 'loc': loc(1, 9, 1, 12) },
      { tag: undefined, loc: loc(1, 13, 1, 13) }
    ]);

    expect(lex('`abcdef`', '__filename')).to.be.eql([
      { tag: 12, string: 'abcdef', tail: true,
        'loc': loc(1, 2, 1, 8)
      },
      { tag: undefined, loc: loc(1, 9, 1, 9) }
    ]);

    expect(lex('``', '__filename')).to.be.eql([
      { tag: 12, string: '', tail: true, 'loc': loc(1, 2, 1, 2) },
      { tag: undefined, loc: loc(1, 3, 1, 3) }
    ]);

    expect(lex('`$${b}`', '__filename')).to.be.eql([
      { tag: 12, string: '$', tail: false,
        'loc': loc(1, 2, 1, 3)
      },
      { tag: 2, lexeme: 'b',
        'loc': loc(1, 5, 1, 6) },
      { tag: 12, string: '', tail: true,
        'loc': loc(1, 7, 1, 7) },
      { tag: undefined, loc: loc(1, 8, 1, 8) }
    ]);

    expect(lex('`abc${d}ef${g}h`', '__filename')).to.be.eql([
      { tag: 12, string: 'abc', tail: false, 'loc': loc(1, 2, 1, 5) },
      { tag: 2, lexeme: 'd', 'loc': loc(1, 7, 1, 8) },
      { tag: 12, string: 'ef', tail: false, 'loc': loc(1, 9, 1, 11) },
      { tag: 2, lexeme: 'g', 'loc': loc(1, 13, 1, 14) },
      { tag: 12, string: 'h', tail: true, 'loc': loc( 1, 15, 1, 16) },
      { tag: undefined, loc: loc(1, 17, 1, 17) }
    ]);

    expect(lex('`abc${d}ef$gh`', '__filename')).to.be.eql([
      { tag: 12, string: 'abc', tail: false, 'loc':  loc(1, 2, 1, 5) },
      { tag: 2, lexeme: 'd', 'loc': loc(1, 7, 1, 8) },
      { tag: 12, string: 'ef$gh', tail: true, 'loc': loc(1, 9, 1, 14) },
      { tag: undefined, loc: loc(1, 15, 1, 15) }
    ]);

    expect(() => {
      lex('`', '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('Unexpect end of file');
    });

    expect(() => {
      lex('`abc${d}e', '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('Unexpect end of file');
    });
  });

  it('type should ok', function () {
    expect(lex('type @default_unit_server = string', '__filename')).to.be.eql([
      {
        lexeme: 'type',
        tag: 2,
        'loc': loc(1, 1, 1, 5)
      },
      {
        lexeme: '@default_unit_server',
        tag: 3,
        'loc': loc(1, 6, 1, 26)
      },
      {
        tag: '=',
        loc: loc(1, 27, 1, 27)
      },
      {
        lexeme: 'string',
        tag: 8,
        'loc': loc(1, 29, 1, 35)
      },
      { tag: undefined, loc: loc(1, 35, 1, 35) }
    ]);

    expect(lex('type @default = (string, string): string', '__filename')).to.be.eql([
      { lexeme: 'type',
        tag: 2,
        'loc': loc(1, 1, 1, 5)
      },
      {
        lexeme: '@default',
        tag: 3,
        'loc': loc(1, 6, 1, 14)
      },
      {
        tag: '=',
        loc: loc(1, 15, 1, 15)
      },
      {
        tag: '(',
        loc: loc(1, 17, 1, 17)
      },
      {
        lexeme: 'string',
        tag: 8,
        'loc': loc(1, 18, 1, 24)
      },
      {
        tag: ',',
        loc: loc(1, 24, 1, 24)
      },
      {
        lexeme: 'string',
        tag: 8,
        'loc': loc(1, 26, 1, 32)
      },
      {
        tag: ')',
        loc: loc(1, 32, 1, 32)
      },
      {
        tag: ':',
        loc: loc(1, 33, 1, 33)
      },
      {
        lexeme: 'string',
        tag: 8,
        'loc': loc(1, 35, 1, 41)
      },
      { tag: undefined, loc: loc(1, 41, 1, 41) }
    ]);

    expect(lex('type @default = async (string, string): string', '__filename')).to.be.eql([
      { lexeme: 'type',
        tag: 2,
        'loc': loc(1, 1, 1, 5)
      },
      {
        lexeme: '@default',
        tag: 3,
        'loc': loc(1, 6, 1, 14)
      },
      {
        tag: '=',
        loc: loc(1, 15, 1, 15)
      },
      {
        lexeme: 'async',
        tag: 2,
        'loc': loc(1, 17, 1, 22)
      },
      {
        tag: '(',
        loc: loc(1, 23, 1, 23)
      },
      {
        lexeme: 'string',
        tag: 8,
        'loc': loc(1, 24, 1, 30)
      },
      {
        tag: ',',
        loc: loc(1, 30, 1, 30)
      },
      {
        lexeme: 'string',
        tag: 8,
        'loc': loc(1, 32, 1, 38)
      },
      {
        tag: ')',
        loc: loc(1, 38, 1, 38)
      },
      {
        tag: ':',
        loc: loc(1, 39, 1, 39)
      },
      {
        lexeme: 'string',
        tag: 8,
        'loc': loc(1, 41, 1, 47)
      },
      { tag: undefined, loc: loc(1, 47, 1, 47) }
    ]);

    expect(lex('type @default = [ string ]', '__filename')).to.be.eql([
      { lexeme: 'type',
        tag: 2,
        'loc': loc(1, 1, 1, 5)
      },
      {
        lexeme: '@default',
        tag: 3,
        'loc': loc(1, 6, 1, 14)
      },
      {
        tag: '=',
        loc: loc(1, 15, 1, 15)
      },
      {
        tag: '[',
        loc: loc(1, 17, 1, 17)
      },
      {
        lexeme: 'string',
        tag: 8,
        'loc': loc(1, 19, 1, 25)
      },
      {
        tag: ']',
        loc: loc(1, 26, 1, 26)
      },
      { tag: undefined, loc: loc(1, 27, 1, 27) }
    ]);
  });

  it('function should ok', function () {
    expect(lex('function', '__filename')).to.be.eql([
      {
        lexeme: 'function',
        tag: 2,
        'loc': loc(1, 1, 1, 9)
      },
      {
        'loc': {
          'end': {
            'column': 9,
            'line': 1,
          },
          'start': {
            'column': 9,
            'line': 1
          }
        },
        'tag': undefined
      }
    ]);
  });

  it('null should ok', function () {
    const tokens = lex('null', '__filename');
    expect(tokens).to.have.length(2);
    expect(tokens.map((item) => token(item))).to.eql([
      {lexeme: 'null', tag: 14},
      {lexeme: undefined, tag: undefined}
    ]);
  });

  it('&& should ok', function () {
    const tokens = lex('&&', '__filename');
    expect(tokens).to.have.length(2);
    expect(tokens.map((item) => token(item))).to.eql([
      {lexeme: '&&', tag: 26},
      {lexeme: undefined, tag: undefined}
    ]);
    expect(tokens[0].toString()).to.be('Operator: `&&`');
  });

  it('& should not ok', function () {
    expect(function () {
      lex('&', '__filename');
    }).to.throwException((e) => {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpect undefined after '&', expect '&'`);
    });
  });

  it('|| should ok', function () {
    const tokens = lex('||', '__filename');
    expect(tokens).to.have.length(2);
    expect(tokens.map((item) => token(item))).to.eql([
      {lexeme: '||', tag: 27},
      {lexeme: undefined, tag: undefined}
    ]);
    expect(tokens[0].toString()).to.be('Operator: `||`');
  });

  it('| should not ok', function () {
    expect(function () {
      lex('|', '__filename');
    }).to.throwException((e) => {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpect undefined after '|', expect '|'`);
    });
  });

  it('try/catch/finally shoul ok', function () {
    const tokens = lex(`try {

      } catch (ex) {

      } finally {

      }`, '__filename');
    expect(tokens.map((item) => token(item))).to.eql([
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
});
