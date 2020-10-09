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

describe('main parser', function () {
  it('empty main file should ok', function () {
    assert.deepStrictEqual(parse('main {}', '__filename'), {
      annotation: undefined,
      comments: new Map(),
      imports: [],
      mainBody: {
        nodes: [],
        tokenRange: [1, 2],
        type: 'mainBody'
      },
      tokenRange: [0, 3],
      type: 'main'
    });
  });

  it('main should ok', function () {
    const ast = parse(`main { main(args: [string]) {} }`, '__filename');
    assert.deepStrictEqual(ast.mainBody.nodes[0], {
      annotation: undefined,
      main: new WordToken(2, 'main', loc(1, 8, 1, 12), 2),
      functionBody: {
        loc: loc(1, 29, 1, 32),
        stmts: {
          type: 'stmts',
          stmts: [],
          tokenRange: [10, 11]
        },
        tokenRange: [10, 11],
        type: 'functionBody'
      },
      params: {
        params: [
          {
            'paramName': new WordToken(2, 'args', loc(1, 13, 1, 17), 4),
            'paramType': {
              'itemType': new WordToken(8, 'string', loc(1, 20, 1, 26), 7),
              'type': 'array'
            },
            'type': 'param'
          }
        ],
        type: 'params'
      },
      tokenRange: [2, 12],
      type: 'main'
    });
  });

  it('module annotation should be ok', function () {
    var ast = parse(`
    /**
     * module annotation
     */
    main {
      main(args: [string]) {}
    }
  `, '__filename');
    assert.deepStrictEqual(ast.annotation, new Annotation('/**\n     * module annotation\n     */', loc(2, 5, 4, 8), 0));
  });

  it('import with comma should ok', function () {
    const ast = parse(`import $oss; main {}`, '__filename');
    assert.deepStrictEqual(ast.imports, [
      {
        type: 'import',
        aliasId: new WordToken(21, '$oss', loc(1, 8, 1, 12), 1),
        tokenRange: [0, 3]
      }
    ]);
  });

  it('only function/main should be ok', function () {
    assert.throws(function () {
      parse(`main { public }`, '__filename');
    }, (ex) => {
      assert.ok(ex instanceof SyntaxError);
      assert.deepStrictEqual(ex.message, 'Unexpected token: Word: `public`. expect "main" or "function"');
      return true;
    });
  });

  it('function should ok', function () {
    var ast = parse(`
      main {
        function callId(): void {
        }
      }`, '__filename');

    const [func] = ast.mainBody.nodes;

    assert.deepStrictEqual(func, {
      'annotation': undefined,
      'functionName': new WordToken(2, 'callId', loc(3, 18, 3, 24), 3),
      'functionBody': {
        'loc': loc(3, 33, 5, 7),
        'stmts': {
          'stmts': [],
          'tokenRange': [8, 9],
          'type': 'stmts'
        },
        'tokenRange': [8, 9],
        'type': 'functionBody'
      },
      'params': {
        'params': [],
        'type': 'params'
      },
      'returnType': new WordToken(8, 'void', loc(3, 28, 3, 32), 7),
      'tokenRange': [2, 9],
      hasThrow: false,
      isAsync: false,
      isStatic: false,
      'type': 'function'
    });
  });

  it('function with annotation should ok', function () {
    const ast = parse(`
      /**
       * global annotation
       */
      main {
        /**
         * function annotation
         */
        function callId(): void {
        }
      }`, '__filename');

    const [func] = ast.mainBody.nodes;
    assert.deepStrictEqual(func.annotation, new Annotation('/**\n         * function annotation\n         */', loc(6, 9, 8, 12), 3));
  });
});
