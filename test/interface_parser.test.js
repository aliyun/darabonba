'use strict';

const assert = require('assert');

const Parser = require('../lib/parser');
const Lexer = require('../lib/lexer');
const { WordToken, Annotation } = require('../lib/tokens');

function parse(source, filePath) {
  const lexer = new Lexer(source, filePath);
  const parser = new Parser(lexer);
  return parser.program();
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

describe('interface parser', function () {
  it('empty interface file should not ok', function () {
    assert.throws(() => {
      parse('', '__filename');
    }, (e) => {
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: EOF. expect 'module', 'model', 'interface' or 'main'`);
      return true;
    });
  });

  it('interface should ok', function () {
    assert.deepStrictEqual(parse('interface I {}', '__filename'), {
      annotation: undefined,
      comments: new Map(),
      imports: [],
      interfaceBody: {
        nodes: [],
        type: 'interfaceBody',
        tokenRange: [2, 3]
      },
      name: new WordToken(2, 'I', loc(1, 11, 1, 12), 1),
      tokenRange: [0, 4],
      type: 'interface'
    });
  });

  it('interface annotation should be ok', function () {
    var ast = parse(`
    /**
     * module annotation
     */
    interface I {}
  `, '__filename');

    assert.deepStrictEqual(ast.annotation, new Annotation('/**\n     * module annotation\n     */', loc(2, 5, 4, 8), 0));
  });

  it('import with comma should ok', function () {
    const ast = parse(`import $oss;
    interface M {}`, '__filename');
    assert.deepStrictEqual(ast.imports, [
      {
        type: 'import',
        aliasId: new WordToken(21, '$oss', loc(1, 8, 1, 12), 1),
        tokenRange: [0, 3]
      }
    ]);
  });

  it('only function should be ok', function () {
    assert.throws(function () {
      parse(`
        interface M {
          public
        }
      `, '__filename');
    }, (ex) => {
      assert.ok(ex instanceof SyntaxError);
      assert.deepStrictEqual(ex.message, 'Unexpected token: Word: `public`. expect "function"');
      return true;
    });
  });

  describe('function', function () {
    it('must be function after async', function () {
      assert.throws(function () {
        parse(`
          interface M {
            async functionx
          }
        `, '__filename');
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'Unexpected token: Word: `functionx`. Expect ID function, but Word: `functionx`');
        return true;
      });
    });

    it('function can not have body', function () {
      var ast = parse(`
        interface M {
          function callId(): string;
          function callId2(): string;
        }
        `, '__filename');

      const [func1, func2] = ast.interfaceBody.nodes;

      assert.deepStrictEqual(func1, {
        'annotation': undefined,
        'isStatic': false,
        'isAsync': false,
        'hasThrow': false,
        'params': {
          'params': [],
          'type': 'params'
        },
        'returnType': new WordToken(8, 'string', loc(3, 30, 3, 36), 8),
        'tokenRange': [3, 10],
        'type': 'function',
        'functionName': new WordToken(2, 'callId', loc(3, 20, 3, 26), 4)
      });
      assert.deepStrictEqual(func2, {
        'annotation': undefined,
        'isStatic': false,
        'isAsync': false,
        'hasThrow': false,
        'params': {
          'params': [],
          'type': 'params'
        },
        'returnType': new WordToken(8, 'string', loc(4, 31, 4, 37), 15),
        'tokenRange': [10, 17],
        'type': 'function',
        'functionName': new WordToken(2, 'callId2', loc(4, 20, 4, 27), 11)
      });
    });

    it('function should ok', function () {
      var ast = parse(`
        interface M {
          function callId(): void;
        }
      `, '__filename');

      const [func] = ast.interfaceBody.nodes;

      assert.deepStrictEqual(func, {
        'annotation': undefined,
        'functionName': new WordToken(2, 'callId', loc(3, 20, 3, 26), 4),
        'params': {
          'params': [],
          'type': 'params'
        },
        'returnType': new WordToken(8, 'void', loc(3, 30, 3, 34), 8),
        'tokenRange': [3, 10],
        hasThrow: false,
        isAsync: false,
        isStatic: false,
        'type': 'function'
      });
    });

    it('function with throws should ok', function () {
      var ast = parse(`
        interface M {
          function callId() throws : string;
          function callId2(): string;
        }
        `, '__filename');

      const [func, func2] = ast.interfaceBody.nodes;
      assert.deepStrictEqual(func.hasThrow, true);
      assert.deepStrictEqual(func2.hasThrow, false);
    });

    it('static function should not ok', function () {
      assert.throws(() => {
        parse(`
          interface M {
            static function equal(actual: any, expected: any, message: string): void;
          }`, '__filename');
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'Unexpected token: Word: `static`. expect "function"');
        return true;
      });
    });

    it('async function should ok', function () {
      var ast = parse(`
        interface M {
          async function equal(actual: any, expected: any, message: string): void;
          function equal2(actual: any, expected: any, message: string): void;
        }
      `, '__filename');
      const [fun, fun2] = ast.interfaceBody.nodes;
      assert.deepStrictEqual(fun.isAsync, true);
      assert.deepStrictEqual(fun2.isAsync, false);
    });

    it('function annotation should be ok', function () {
      const ast = parse(`
      interface M {
        /**
         * description
         * @param key key description
         * @return returns value
         */
        function hello(key: string): string;
      }
    `, '__filename');
      const [fun] = ast.interfaceBody.nodes;
      assert.deepStrictEqual(fun.annotation, new Annotation('/**\n         * description\n         * @param key key description\n         * @return returns value\n         */', loc(3, 9, 7, 12), 3));
    });
  });
});
