'use strict';

const assert = require('assert');

const Parser = require('../lib/parser');
const Lexer = require('../lib/lexer');
const { WordToken, StringLiteral, NumberLiteral, Annotation, TemplateElement } = require('../lib/tokens');

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

describe('module parser', function () {
  it('empty module file should not ok', function () {
    assert.throws(() => {
      parse('', '__filename');
    }, (e) => {
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: EOF. expect 'module', 'model', 'interface' or 'main'`);
      return true;
    });
  });

  it('mini module should ok', function () {
    assert.deepStrictEqual(parse('module M {}', '__filename'), {
      annotation: undefined,
      comments: new Map(),
      implements: [],
      extends: undefined,
      imports: [],
      moduleBody: {
        nodes: [],
        type: 'moduleBody',
        tokenRange: [2, 3]
      },
      name: new WordToken(2, 'M', loc(1, 8, 1, 9), 1),
      tokenRange: [0, 4],
      type: 'module'
    });
  });

  it('module annotation should be ok', function () {
    var ast = parse(`
    /**
     * module annotation
     */
    module M {}
  `, '__filename');

    assert.deepStrictEqual(ast.annotation, new Annotation('/**\n     * module annotation\n     */', loc(2, 5, 4, 8), 0));
  });

  it('import with comma should ok', function () {
    const ast = parse(`import $oss;
    module M {}`, '__filename');
    assert.deepStrictEqual(ast.imports, [
      {
        type: 'import',
        aliasId: new WordToken(21, '$oss', loc(1, 8, 1, 12), 1),
        tokenRange: [0, 3]
      }
    ]);
  });

  describe('extends', function () {
    it('extends from module should ok', function () {
      const ast = parse('module M extends Base {}', '__filename');
      assert.deepStrictEqual(ast.extends, new WordToken(2, 'Base', loc(1, 18, 1, 22), 3));
    });

    it('extends from extern module should ok', function () {
      const ast = parse('module M extends $oss.Base {}', '__filename');
      assert.deepStrictEqual(ast.extends, {
        type: 'extern_component',
        aliasId: new WordToken(21, '$oss', loc(1, 18, 1, 22), 3),
        component: new WordToken(2, 'Base', loc(1, 23, 1, 27), 5),
        loc: loc(1, 18, 1, 27),
        tokenRange: [3, 6]
      });
    });

    it('extends from other should not ok', function () {
      assert.throws(function () {
        parse('module M extends 1 {}', '__filename');
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, 'Unexpected token: Number: 1. expect (extern) module/model/interface');
        return true;
      });
    });
  });

  it('only function/type/init should be ok', function () {
    assert.throws(function () {
      parse(`
        module M {
          public
        }
      `, '__filename');
    }, (ex) => {
      assert.ok(ex instanceof SyntaxError);
      assert.deepStrictEqual(ex.message, 'Unexpected token: Word: `public`. expect "const", "type", "function" or "init"');
      return true;
    });
  });

  describe('type', function () {
    function moduleBody(value) {
      return parse(`
      module M {
        ${value}
      }
      `, '__filename').moduleBody.nodes;
    }

    it('type should be ok', function () {
      assert.throws(() => {
        moduleBody('type');
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `Unexpected token: }. Expect VID, but }`);
        return true;
      });

      assert.throws(() => {
        moduleBody('type @id');
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `Unexpected token: }. Expect =, but }`);
        return true;
      });

      assert.throws(() => {
        moduleBody('type @id = ');
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `Unexpected token: }. expect base type, model id or array form`);
        return true;
      });
    });

    it('type with string should ok', function () {
      assert.deepStrictEqual(moduleBody('type @id = string'), [
        {
          'annotation': undefined,
          'type': 'type',
          'vid': new WordToken(3, '@id', loc(3, 14, 3, 17), 4),
          'value': new WordToken(8, 'string', loc(3, 20, 3, 26), 6),
          'tokenRange': [3, 7]
        }
      ]);

      // with ; should ok
      assert.deepStrictEqual(moduleBody('type @id = string;'), [
        {
          'annotation': undefined,
          'type': 'type',
          'vid': new WordToken(3, '@id', loc(3, 14, 3, 17), 4),
          'value': new WordToken(8, 'string', loc(3, 20, 3, 26), 6),
          'tokenRange': [3, 7]
        }
      ]);
    });

    it('type with map should ok', function () {
      assert.deepStrictEqual(moduleBody('type @id = map[string]string'), [
        {
          'annotation': undefined,
          'tokenRange': [3, 11],
          'type': 'type',
          'vid': new WordToken(3, '@id', loc(3, 14, 3, 17), 4),
          'value': {
            keyType: new WordToken(8, 'string', loc(3, 24, 3, 30), 8),
            valueType: new WordToken(8, 'string', loc(3, 31, 3, 37), 10),
            type: 'map',
            'loc': loc(3, 20, 3, 37)
          }
        }
      ]);
    });

    it('type with array should ok', function () {
      assert.deepStrictEqual(moduleBody('type @id = [ string ]'), [
        {
          'annotation': undefined,
          'tokenRange': [3, 9],
          'type': 'type',
          'vid': new WordToken(3, '@id', loc(3, 14, 3, 17), 4),
          'value': {
            'itemType': new WordToken(8, 'string', loc(3, 22, 3, 28), 7),
            'type': 'array'
          }
        }
      ]);
    });
  });

  describe('init', function () {
    it('init should ok', function () {
      var ast = parse(`
    module M {
      init();
    }
  `, '__filename');
      const [init] = ast.moduleBody.nodes;
      assert.deepStrictEqual(init.type, 'init');
      assert.deepStrictEqual(init.params, {
        'params': [],
        'type': 'params'
      });
    });

    it('init without comma should ok', function () {
      var ast = parse(`
    module M {
      init()
    }
  `, '__filename');
      const [init] = ast.moduleBody.nodes;
      assert.deepStrictEqual(init.type, 'init');
      assert.deepStrictEqual(init.params, {
        'params': [],
        'type': 'params'
      });
    });

    it('init(config) should ok', function () {
      var ast = parse(`
    module M {
      init(config: Config);
    }
  `, '__filename');
      const [init] = ast.moduleBody.nodes;
      assert.deepStrictEqual(init.type, 'init');
      assert.deepStrictEqual(init.params, {
        'params': [
          {
            'paramName': new WordToken(2, 'config', loc(3, 12, 3, 18), 5),
            'paramType': new WordToken(2, 'Config', loc(3, 20, 3, 26), 7),
            'type': 'param'
          }
        ],
        'type': 'params'
      });
    });

    it('init(config) {} should ok', function () {
      var ast = parse(`
    module M {
      init() {}
    }
  `, '__filename');
      const [init] = ast.moduleBody.nodes;
      assert.deepStrictEqual(init.type, 'init');
      assert.deepStrictEqual(init.params, {
        'params': [
        ],
        'type': 'params'
      });
      assert.deepStrictEqual(init.initBody, {
        'stmts': [],
        'tokenRange': [6, 7],
        'type': 'stmts'
      });
    });
  });

  describe('function', function () {
    it('function should ok', function () {
      var ast = parse(`
        module M {
          function callId(): void {
          }
        }
      `, '__filename');

      const [func] = ast.moduleBody.nodes;

      assert.deepStrictEqual(func, {
        'annotation': undefined,
        'functionName': new WordToken(2, 'callId', loc(3, 20, 3, 26), 4),
        'functionBody': {
          'loc': loc(3, 35, 5, 9),
          'stmts': {
            'stmts': [],
            'tokenRange': [9, 10],
            'type': 'stmts'
          },
          'tokenRange': [
            9,
            10
          ],
          'type': 'functionBody'
        },
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

    it('function should ok without body', function () {
      var ast = parse(`
        module M {
          function callId(): string;
          function callId2(): string
        }
        `, '__filename');

      const [func1, func2] = ast.moduleBody.nodes;

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
        'tokenRange': [3, 9],
        'type': 'function',
        'functionBody': null,
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
        'tokenRange': [10, 16],
        'type': 'function',
        'functionBody': null,
        'functionName': new WordToken(2, 'callId2', loc(4, 20, 4, 27), 11)
      });
    });

    it('function with throws should ok', function () {
      var ast = parse(`
        module M {
          function callId() throws : string;
          function callId2(): string;
        }
        `, '__filename');

      const [func, func2] = ast.moduleBody.nodes;
      assert.deepStrictEqual(func.hasThrow, true);
      assert.deepStrictEqual(func2.hasThrow, false);
    });

    it('static function should ok', function () {
      var ast = parse(`
        module M {
          static function equal(actual: any, expected: any, message: string): void;
          function equal2(actual: any, expected: any, message: string): void;
        }
      `, '__filename');
      const [fun, fun2] = ast.moduleBody.nodes;
      assert.deepStrictEqual(fun.isStatic, true);
      assert.deepStrictEqual(fun2.isStatic, false);
    });

    it('async function should ok', function () {
      var ast = parse(`
        module M {
          async function equal(actual: any, expected: any, message: string): void;
          function equal2(actual: any, expected: any, message: string): void;
        }
      `, '__filename');
      const [fun, fun2] = ast.moduleBody.nodes;
      assert.deepStrictEqual(fun.isAsync, true);
      assert.deepStrictEqual(fun2.isAsync, false);
    });

    it('static async function should ok', function () {
      var ast = parse(`
        module M {
          static async function equal(actual: any, expected: any, message: string): void;
        }
      `, '__filename');
      const [fun] = ast.moduleBody.nodes;
      assert.deepStrictEqual(fun.isAsync, true);
      assert.deepStrictEqual(fun.isStatic, true);
    });

    it('function annotation should be ok', function () {
      const ast = parse(`
      module M {
        /**
         * description
         * @param key key description
         * @return returns value
         */
        static function hello(key: string): string;
      }
    `, '__filename');
      const [fun] = ast.moduleBody.nodes;
      assert.deepStrictEqual(fun.annotation, new Annotation('/**\n         * description\n         * @param key key description\n         * @return returns value\n         */', loc(3, 9, 7, 12), 3));
    });
  });

  describe('statements', function () {
    function stmts(value) {
      var ast = parse(`
        module M {
          function id(): void {
            ${value}
          }
        }
      `, '__filename');

      return ast.moduleBody.nodes[0].functionBody.stmts;
    }

    it('stmts should ok', function () {
      assert.deepStrictEqual(stmts(''), {
        stmts: [],
        tokenRange: [9, 10],
        type: 'stmts'
      });

      assert.throws(() => {
        stmts('...');
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `Unexpected token: .. expect valid expression`);
        return true;
      });
    });

    it('if stmt should ok', function () {
      const ast = stmts(`
        if (true) {
        }
      `);
      assert.deepStrictEqual(ast, {
        stmts: [
          {
            type: 'if',
            tokenRange: [10, 15],
            branches: [
              {
                'condition': {
                  'loc': loc(5, 13, 5, 17),
                  'tokenRange': [12, 13],
                  'type': 'boolean',
                  'value': true
                },
                'stmts': {
                  'stmts': [],
                  'tokenRange': [14, 15],
                  'type': 'stmts'
                },
                'type': 'if_branch'
              }
            ]
          }
        ],
        tokenRange: [9, 16],
        type: 'stmts'
      });
    });

    it('if/elseif stmt should ok', function () {
      const ast = stmts(`
        if (true) {
        } else if (true) {
        }
      `);
      assert.deepStrictEqual(ast, {
        stmts: [
          {
            type: 'if',
            tokenRange: [10, 22],
            branches: [
              {
                'condition': {
                  'loc': loc(5, 13, 5, 17),
                  'tokenRange': [12, 13],
                  'type': 'boolean',
                  'value': true
                },
                'stmts': {
                  'stmts': [],
                  'tokenRange': [14, 15],
                  'type': 'stmts'
                },
                'type': 'if_branch'
              },
              {
                'condition': {
                  'loc': loc(6, 20, 6, 24),
                  'tokenRange': [19, 20],
                  'type': 'boolean',
                  'value': true
                },
                'stmts': {
                  'stmts': [],
                  'tokenRange': [21, 22],
                  'type': 'stmts'
                },
                'type': 'if_branch'
              }
            ]
          }
        ],
        tokenRange: [9, 23],
        type: 'stmts'
      });
    });

    it('if/else stmt should ok', function () {
      const ast = stmts(`
        if (true) {
        } else {
        }
      `);
      assert.deepStrictEqual(ast, {
        stmts: [
          {
            type: 'if',
            tokenRange: [10, 18],
            branches: [
              {
                'condition': {
                  'loc': loc(5, 13, 5, 17),
                  'tokenRange': [12, 13],
                  'type': 'boolean',
                  'value': true
                },
                'stmts': {
                  'stmts': [],
                  'tokenRange': [14, 15],
                  'type': 'stmts'
                },
                'type': 'if_branch'
              },
              {
                'stmts': {
                  'stmts': [],
                  'tokenRange': [17, 18],
                  'type': 'stmts'
                },
                'type': 'else_branch'
              }
            ]
          }
        ],
        tokenRange: [9, 19],
        type: 'stmts'
      });
    });

    it('only if or { should be after else', function () {
      assert.throws(function () {
        stmts(`if (true) {
            } else x {
            }
          }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'Unexpected token: Word: `x`. expect "if" or "{"');
        return true;
      });
    });

    it('while should ok', function () {
      var ast = stmts(`
        while (true) {
        }`);
      assert.deepStrictEqual(ast, {
        type: 'stmts',
        tokenRange: [9, 16],
        stmts: [
          {
            'type': 'while',
            'tokenRange': [10, 15],
            'condition': {
              loc: loc(5, 16, 5, 20),
              'tokenRange': [12, 13],
              'type': 'boolean',
              'value': true
            },
            'stmts': {
              'stmts': [],
              'tokenRange': [14, 15],
              'type': 'stmts'
            }
          }
        ]
      });
    });

    it('for should ok', function () {
      const ast = stmts(`
        for ( ; ; ) {
        }`);
      assert.deepStrictEqual(ast.stmts, [
        {
          'type': 'for',
          'tokenRange': [10, 16],
          'init': {
            'tokenRange': [12, 12],
            loc: loc(5, 15, 5, 15),
            'type': 'empty'
          },
          'test': {
            'tokenRange': [13, 13],
            loc: loc(5, 17, 5, 17),
            'type': 'empty'
          },
          'update': {
            'tokenRange': [14, 14],
            loc: loc(5, 19, 5, 19),
            'type': 'empty'
          },
          'stmts': {
            'stmts': [],
            'tokenRange': [15, 16],
            'type': 'stmts'
          }
        }
      ]);

      assert.deepStrictEqual(stmts(`for ( var i = 0; ; ) {}`).stmts, [
        {
          'type': 'for',
          'tokenRange': [10, 20],
          'init': {
            'tokenRange': [12, 16],
            id: new WordToken(2, 'i', loc(4, 23, 4, 24), 13),
            expr: {
              type: 'number',
              loc: loc(4, 27, 4, 28),
              tokenRange: [15, 16],
              value: new NumberLiteral('0', 'integer', loc(4, 27, 4, 28), 15),
            },
            expectedType: undefined,
            'type': 'declare_expr'
          },
          'test': {
            'tokenRange': [17, 17],
            loc: loc(4, 30, 4, 30),
            'type': 'empty'
          },
          'update': {
            'tokenRange': [18, 18],
            loc: loc(4, 32, 4, 32),
            'type': 'empty'
          },
          'stmts': {
            'stmts': [],
            'tokenRange': [19, 20],
            'type': 'stmts'
          }
        }
      ]);

      assert.deepStrictEqual(stmts(`for ( var i: int32 = 0; ; ) {}`).stmts, [
        {
          'type': 'for',
          'tokenRange': [10, 22],
          'init': {
            'tokenRange': [12, 18],
            id: new WordToken(2, 'i', loc(4, 23, 4, 24), 13),
            expr: {
              type: 'number',
              loc: loc(4, 34, 4, 35),
              tokenRange: [17, 18],
              value: new NumberLiteral('0', 'integer', loc(4, 34, 4, 35), 17),
            },
            expectedType: new WordToken(8, 'int32', loc(4, 26, 4, 31), 15),
            'type': 'declare_expr'
          },
          'test': {
            'tokenRange': [19, 19],
            loc: loc(4, 37, 4, 37),
            'type': 'empty'
          },
          'update': {
            'tokenRange': [20, 20],
            loc: loc(4, 39, 4, 39),
            'type': 'empty'
          },
          'stmts': {
            'stmts': [],
            'tokenRange': [21, 22],
            'type': 'stmts'
          }
        }
      ]);
    });

    it('for of should ok', function () {
      const ast = stmts(`
        for (var id of []) {
        }`);
      assert.deepStrictEqual(ast.stmts, [
        {
          'type': 'for_of',
          'tokenRange': [10, 19],
          'right': {
            'tokenRange': [15, 17],
            'items': [],
            'type': 'array'
          },
          'left': {
            expectedType: undefined,
            expr: undefined,
            type: 'declare_expr',
            tokenRange: [12, 14],
            id: new WordToken(2, 'id', loc(5, 18, 5, 20), 13)
          },
          'stmts': {
            'stmts': [],
            'tokenRange': [18, 19],
            'type': 'stmts'
          }
        }
      ]);
    
      assert.throws(() => {
        stmts(`for (v of []) {}`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'Unexpected token: Word: `of`. must be declare expression');
        return true;
      });
    });

    it('try/catch should ok', function () {
      var ast = stmts(`
        try {
        } catch (ex) {
        }
      `);
      assert.deepStrictEqual(ast.stmts, [
        {
          'type': 'try',
          'tryBlock': {
            'stmts': [],
            'tokenRange': [11, 12],
            'type': 'stmts'
          },
          'catchId': new WordToken(2, 'ex', loc(6, 18, 6, 20), 15),
          'catchBlock': {
            stmts: [],
            'tokenRange': [17, 18],
            'type': 'stmts'
          },
          'tokenRange': [10, 18],
          finallyBlock: null
        }
      ]);
    });

    it('try/catch/finally should ok', function () {
      const ast = stmts(`
        try {
        } catch (ex) {
        } finally {
        }
      `);
      assert.deepStrictEqual(ast.stmts, [
        {
          'type': 'try',
          'tokenRange': [10, 21],
          'tryBlock': {
            'stmts': [],
            'tokenRange': [11, 12],
            'type': 'stmts'
          },
          'catchId': new WordToken(2, 'ex', loc(6, 18, 6, 20), 15),
          'catchBlock': {
            stmts: [
            ],
            'tokenRange': [17, 18],
            'type': 'stmts'
          },
          'finallyBlock': {
            'stmts': [
            ],
            'tokenRange': [20, 21],
            'type': 'stmts'
          }
        }
      ]);
    });

    it('try/finally should ok', function () {
      const ast = stmts(`
        try {
        } finally {
        }
      `);

      assert.deepStrictEqual(ast.stmts, [
        {
          'type': 'try',
          'tokenRange': [10, 15],
          'tryBlock': {
            'stmts': [],
            'tokenRange': [11, 12],
            'type': 'stmts'
          },
          'catchId': null,
          'finallyBlock': {
            stmts: [],
            'tokenRange': [14, 15],
            'type': 'stmts'
          },
          'catchBlock': null
        }
      ]);
    });

    it('only try should not ok', () => {
      assert.throws(() => {
        stmts(`
          try {
            Util.print("try block");
          }
        `);
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `Unexpected token: }. "try" expect "catch" or "finally"`);
        return true;
      });
    });

    it('break should ok', function () {
      const ast = stmts(`
            break;
      `);
      assert.deepStrictEqual(ast.stmts, [
        {
          'tokenRange': [10, 11],
          'type': 'break'
        }
      ]);
    });

    it('return should ok', function () {
      var ast = stmts(`return;`);
      assert.deepStrictEqual(ast.stmts, [
        {
          'tokenRange': [10, 12],
          'loc': loc(4, 13, 4, 19),
          expr: {
            'loc': loc(4, 19, 4, 19),
            type: 'empty',
            tokenRange: [11, 11]
          },
          'type': 'return'
        }]);
    });

    it('return null should ok', function () {
      var ast = stmts(`return null;`);
      assert.deepStrictEqual(ast.stmts, [
        {
          'loc': loc(4, 13, 4, 24),
          'tokenRange': [10, 13],
          'type': 'return',
          expr: {
            tokenRange: [11, 12],
            type: 'null'
          }
        }]);
    });

    it('throw should ok', function () {
      assert.deepStrictEqual(stmts('throw {}').stmts, [
        {
          'expr': {
            'fields': [],
            'type': 'map',
            'tokenRange': [11, 12],
            loc: loc(4, 19, 5, 11)
          },
          'tokenRange': [10, 12],
          'type': 'throw'
        }
      ]);

      // with comma
      assert.deepStrictEqual(stmts('throw {};').stmts, [
        {
          'expr': {
            'fields': [],
            'type': 'map',
            'tokenRange': [11, 12],
            loc: loc(4, 19, 4, 21)
          },
          'tokenRange': [10, 13],
          'type': 'throw'
        }
      ]);
    });

    it('declare should ok', function () {
      var ast = stmts(`var id = "random_id";`);
      assert.deepStrictEqual(ast.stmts, [
        {
          'expr': {
            type: 'string',
            tokenRange: [13, 14],
            loc: loc(4, 23, 4, 32),
            value: new StringLiteral('random_id', loc(4, 23, 4, 32), 13),
          },
          'id': new WordToken(2, 'id', loc(4, 17, 4, 19), 11),
          expectedType: undefined,
          'tokenRange': [10, 14],
          'type': 'declare'
        }
      ]);
    });

    it('declare with expected type should ok', function () {
      var ast = stmts(`var a : string = "";`);
      assert.deepStrictEqual(ast.stmts, [
        {
          'type': 'declare',
          'tokenRange': [10, 16],
          'id': new WordToken(2, 'a', loc(4, 17, 4, 18), 11),
          'expectedType': new WordToken(8, 'string', loc(4, 21, 4, 27), 13),
          'expr': {
            'loc': loc(4, 31, 4, 31),
            'type': 'string',
            'tokenRange': [15, 16],
            'value': new StringLiteral('', loc(4, 31, 4, 31), 15)
          }
        }
      ]);
    });

  });

  describe('expressions', function () {
    function expr(value) {
      var ast = parse(`
      module M {
        function test(): void {
          ${value};
        }
      }
    `, '__filename');

      return ast.moduleBody.nodes[0].functionBody.stmts.stmts[0];
    }

    it('empty should ok', function () {
      assert.deepStrictEqual(expr(''), {
        loc: loc(4, 11, 4, 11),
        tokenRange: [10, 10],
        type: 'empty'
      });
    });

    it('string should ok', function () {
      assert.deepStrictEqual(expr(`'id2'`), {
        'value': new StringLiteral('id2', loc(4, 12, 4, 15), 10),
        'tokenRange': [10, 11],
        loc: loc(4, 12, 4, 15),
        'type': 'string'
      });
    });

    it('number should ok', function () {
      assert.deepStrictEqual(expr(`123`), {
        'value': new NumberLiteral('123', 'integer', loc(4, 11, 4, 14), 10),
        'tokenRange': [10, 11],
        loc: loc(4, 11, 4, 14),
        'type': 'number'
      });
    });

    it('bool should ok', function () {
      assert.deepStrictEqual(expr(`true`), {
        'tokenRange': [10, 11],
        loc: loc(4, 11, 4, 15),
        'type': 'boolean',
        value: true
      });

      assert.deepStrictEqual(expr(`false`), {
        'value': false,
        'tokenRange': [10, 11],
        loc: loc(4, 11, 4, 16),
        'type': 'boolean'
      });
    });

    it('null should ok', function () {
      assert.deepStrictEqual(expr(`null`), {
        'tokenRange': [10, 11],
        'type': 'null'
      });
    });

    it('template string should ok', function () {
      assert.deepStrictEqual(expr('`abcdefg`'), {
        'elements': [
          {
            type: 'element',
            value: new TemplateElement('abcdefg', true, loc(4, 12, 4, 19), 10)
          }
        ],
        'tokenRange': [10, 11],
        'type': 'template_string'
      });

      assert.deepStrictEqual(expr('`abc${"abc"}defg`'), {
        'elements': [
          {
            'type': 'element',
            'value': new TemplateElement('abc', false, loc(4, 12, 4, 15), 10)
          },
          {
            'expr': {
              'type': 'string',
              'value': new StringLiteral('abc', loc(4, 18, 4, 21), 11),
              loc: loc(4, 18, 4, 21),
              'tokenRange': [11, 12],
            },
            'type': 'expr'
          },
          {
            'type': 'element',
            'value': new TemplateElement('defg', true, loc(4, 23, 4, 27), 12)
          }
        ],
        'tokenRange': [10, 13],
        'type': 'template_string'
      });

      assert.deepStrictEqual(expr('`abc${"abc"}d${"e"}fg`'), {
        'elements': [
          {
            'type': 'element',
            'value': new TemplateElement('abc', false, loc(4, 12, 4, 15), 10)
          },
          {
            'expr': {
              'type': 'string',
              'value': new StringLiteral('abc', loc(4, 18, 4, 21), 11),
              'tokenRange': [11, 12],
              loc: loc(4, 18, 4, 21)
            },
            'type': 'expr'
          },
          {
            'type': 'element',
            'value': new TemplateElement('d', false, loc(4, 23, 4, 24), 12)
          },
          {
            'expr': {
              'type': 'string',
              'value': new StringLiteral('e', loc(4, 27, 4, 28), 13),
              'tokenRange': [13, 14],
              loc: loc(4, 27, 4, 28)
            },
            'type': 'expr'
          },
          {
            'type': 'element',
            'value': new TemplateElement('fg', true, loc(4, 30, 4, 32), 14)
          }
        ],
        'tokenRange': [10, 15],
        'type': 'template_string'
      });
    });

    it('super() should ok', function () {
      var ast = parse(`
        module M {
          init() {
            super();
          }
        }`, '__filename');
      let [init] = ast.moduleBody.nodes;
      const [expr] = init.initBody.stmts;
      assert.deepStrictEqual(expr, {
        'args': [],
        'loc': loc(4, 18, 4, 20),
        'tokenRange': [7, 10],
        'type': 'super'
      });
    });

    it('new model should ok', function () {
      var ast = expr(`new Config{}`);
      assert.deepStrictEqual(ast, {
        component: new WordToken(2, 'Config', loc(4, 15, 4, 21), 11),
        'fields': {
          fields: [],
          loc: loc(4, 21, 4, 23),
          tokenRange: [12, 13],
          type: 'fields'
        },
        loc: loc(4, 11, 4, 23),
        'tokenRange': [10, 14],
        'type': 'construct_model'
      });

      assert.deepStrictEqual(expr(`new Config{ key = '' }`).fields, {
        fields: [
          {
            expr: {
              type: 'string',
              value: new StringLiteral('', loc(4, 30, 4, 30), 15),
              loc: loc(4, 30, 4, 30),
              tokenRange: [15, 16]
            },
            key: new WordToken(2, 'key', loc(4, 23, 4, 26), 13),
            'type': 'modelField',
            tokenRange: [13, 16]
          }
        ],
        loc: loc(4, 21, 4, 33),
        tokenRange: [12, 16],
        type: 'fields'
      });

      assert.deepStrictEqual(expr(`new Config{ key = '', }`).fields, {
        fields: [
          {
            expr: {
              type: 'string',
              value: new StringLiteral('', loc(4, 30, 4, 30), 15),
              loc: loc(4, 30, 4, 30),
              tokenRange: [15, 16]
            },
            key: new WordToken(2, 'key', loc(4, 23, 4, 26), 13),
            'type': 'modelField',
            tokenRange: [13, 16]
          }
        ],
        loc: loc(4, 21, 4, 34),
        tokenRange: [12, 17],
        type: 'fields'
      });

      assert.deepStrictEqual(expr(`new Config{ key = '', key2 = '' }`).fields, {
        fields: [
          {
            expr: {
              type: 'string',
              value: new StringLiteral('', loc(4, 30, 4, 30), 15),
              loc: loc(4, 30, 4, 30),
              tokenRange: [15, 16]
            },
            key: new WordToken(2, 'key', loc(4, 23, 4, 26), 13),
            'type': 'modelField',
            tokenRange: [13, 16]
          },
          {
            expr: {
              type: 'string',
              value: new StringLiteral('', loc(4, 41, 4, 41), 19),
              loc: loc(4, 41, 4, 41),
              tokenRange: [19, 20]
            },
            key: new WordToken(2, 'key2', loc(4, 33, 4, 37), 17),
            'type': 'modelField',
            tokenRange: [17, 20]
          }
        ],
        loc: loc(4, 21, 4, 44),
        tokenRange: [12, 20],
        type: 'fields'
      });

      assert.throws(() => {
        expr(`new 123`);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, 'Unexpected token: Number: 123. expect (extern) module/model/interface');
        return true;
      });

      assert.throws(() => {
        expr(`new Config{ key = '' 123 }`);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, 'Unexpected token: Number: 123. expect ","');
        return true;
      });
    });

    it('new extern model should ok', function () {
      var ast = expr(`new $oss.Config{}`);
      assert.deepStrictEqual(ast, {
        component: {
          'aliasId': new WordToken(21, '$oss', loc(4, 15, 4, 19), 11),
          component: new WordToken(2, 'Config', loc(4, 20, 4, 26), 13),
          tokenRange: [11, 14],
          loc: loc(4, 15, 4, 26),
          'type': 'extern_component'
        },
        'fields': {
          fields: [],
          loc: loc(4, 26, 4, 28),
          tokenRange: [14, 15],
          type: 'fields'
        },
        loc: loc(4, 11, 4, 28),
        'tokenRange': [10, 16],
        'type': 'construct_model'
      });
    });

    it('new module should ok', function () {
      var ast = expr(`new Client()`);
      assert.deepStrictEqual(ast, {
        component: new WordToken(2, 'Client', loc(4, 15, 4, 21), 11),
        'args': [],
        'tokenRange': [10, 14],
        loc: loc(4, 11, 4, 23),
        'type': 'construct_module'
      });
    });

    it('new extern module should ok', function () {
      var ast = expr(`new $oss.Client()`);
      assert.deepStrictEqual(ast, {
        component: {
          type: 'extern_component',
          aliasId: new WordToken(21, '$oss', loc(4, 15, 4, 19), 11),
          component: new WordToken(2, 'Client', loc(4, 20, 4, 26), 13),
          loc: loc(4, 15, 4, 26),
          tokenRange: [11, 14]
        },
        'args': [],
        'tokenRange': [10, 16],
        loc: loc(4, 11, 4, 28),
        'type': 'construct_module'
      });
    });

    it('map should ok', function () {
      assert.deepStrictEqual(expr('{}'), {
        'fields': [],
        'type': 'map',
        'tokenRange': [10, 12],
        loc: loc(4, 11, 4, 13)
      });

      assert.deepStrictEqual(expr(`{'a' = 1}`), {
        'fields': [
          {
            'expr': {
              'type': 'number',
              'value': new NumberLiteral('1', 'integer', loc(4, 18, 4, 19), 13),
              'tokenRange': [13, 14],
              loc: loc(4, 18, 4, 19)
            },
            'key': new StringLiteral('a', loc(4, 13, 4, 14), 11),
            'tokenRange': [11, 14],
            'type': 'mapField'
          }
        ],
        'type': 'map',
        'tokenRange': [10, 15],
        loc: loc(4, 11, 4, 20)
      });

      assert.deepStrictEqual(expr(`{'a' = 1,}`), {
        'fields': [
          {
            'expr': {
              'type': 'number',
              'value': new NumberLiteral('1', 'integer', loc(4, 18, 4, 19), 13),
              'tokenRange': [13, 14],
              loc: loc(4, 18, 4, 19)
            },
            'key': new StringLiteral('a', loc(4, 13, 4, 14), 11),
            'tokenRange': [11, 14],
            'type': 'mapField'
          }
        ],
        'type': 'map',
        'tokenRange': [10, 16],
        loc: loc(4, 11, 4, 21)
      });

      assert.deepStrictEqual(expr(`{'a' = 1, 'b' = 2L, 'c' = 1.2}`), {
        'fields': [
          {
            'expr': {
              'type': 'number',
              'value': new NumberLiteral('1', 'integer', loc(4, 18, 4, 19), 13),
              'tokenRange': [13, 14],
              loc: loc(4, 18, 4, 19)
            },
            'key': new StringLiteral('a', loc(4, 13, 4, 14), 11),
            'tokenRange': [11, 14],
            'type': 'mapField'
          },
          {
            'expr': {
              'type': 'number',
              'value': new NumberLiteral('2', 'long', loc(4, 27, 4, 29), 17),
              'tokenRange': [17, 18],
              loc: loc(4, 27, 4, 29)
            },
            'key': new StringLiteral('b', loc(4, 22, 4, 23), 15),
            'tokenRange': [15, 18],
            'type': 'mapField'
          },
          {
            'expr': {
              'type': 'number',
              'value': new NumberLiteral('1.2', 'float', loc(4, 37, 4, 40), 21),
              'tokenRange': [21, 22],
              loc: loc(4, 37, 4, 40)
            },
            'key': new StringLiteral('c', loc(4, 32, 4, 33), 19),
            'tokenRange': [19, 22],
            'type': 'mapField'
          }
        ],
        'tokenRange': [10, 23],
        'type': 'map',
        loc: loc(4, 11, 4, 41)
      });

      assert.throws(() => {
        expr(`{'a' = 1, 'b' = 2.}`);
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `Unexpected token: .. expect ","`);
        return true;
      });

      assert.throws(() => {
        expr('{.}');
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `Unexpected token: }. Expect ., but }`);
        return true;
      });

      assert.throws(() => {
        expr('{..}');
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `Unexpected token: }. Expect ., but }`);
        return true;
      });

      assert.throws(() => {
        expr('{...}');
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `Unexpected token: }. expect valid expression`);
        return true;
      });

      assert.throws(() => {
        expr('{*}}');
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `Unexpected token: *. expect "..." or key`);
        return true;
      });
    });

    it('map with expand should ok', function () {
      assert.deepStrictEqual(expr('{...a}'), {
        'fields': [
          {
            'expr': {
              'id': new WordToken(2, 'a', loc(4, 15, 4, 16), 14),
              'tokenRange': [14, 15],
              loc: loc(4, 15, 4, 16),
              'type': 'id'
            },
            'tokenRange': [11, 15],
            'type': 'expandField'
          }
        ],
        'tokenRange': [10, 16],
        'type': 'map',
        loc: loc(4, 11, 4, 17)
      });
    });

    it('array should ok', function () {
      assert.deepStrictEqual(expr('[]'), {
        'items': [],
        'tokenRange': [10, 12],
        'type': 'array'
      });

      assert.deepStrictEqual(expr('[1]'), {
        'items': [
          {
            'loc': loc(4, 12, 4, 13),
            'tokenRange': [11, 12],
            'type': 'number',
            'value': new NumberLiteral('1', 'integer', loc(4, 12, 4, 13), 11)
          }
        ],
        'tokenRange': [10, 13],
        'type': 'array'
      });

      assert.deepStrictEqual(expr('[1, 2]'), {
        'items': [
          {
            'loc': loc(4, 12, 4, 13),
            'tokenRange': [11, 12],
            'type': 'number',
            'value': new NumberLiteral('1', 'integer', loc(4, 12, 4, 13), 11)
          },
          {
            'loc': loc(4, 15, 4, 16),
            'tokenRange': [13, 14],
            'type': 'number',
            'value': new NumberLiteral('2', 'integer', loc(4, 15, 4, 16), 13)
          }
        ],
        'tokenRange': [10, 15],
        'type': 'array'
      });

      assert.throws(() => {
        expr('[1 1]');
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `Unexpected token: Number: 1. expect ","`);
        return true;
      });
    });

    it('id should ok', function () {
      assert.deepStrictEqual(expr('id2'), {
        'id': new WordToken(2, 'id2', loc(4, 11, 4, 14), 10),
        'tokenRange': [10, 11],
        loc: loc(4, 11, 4, 14),
        'type': 'id'
      });

      assert.deepStrictEqual(expr('@id2'), {
        'id': new WordToken(3, '@id2', loc(4, 11, 4, 15), 10),
        'tokenRange': [10, 11],
        loc: loc(4, 11, 4, 15),
        'type': 'id'
      });
    });

    it('access path should ok', function () {
      assert.deepStrictEqual(expr('id2.id2'), {
        object: {
          type: 'id',
          loc: loc(4, 11, 4, 14),
          id: new WordToken(2, 'id2', loc(4, 11, 4, 14), 10),
        },
        property: new WordToken(2, 'id2', loc(4, 15, 4, 18), 12),
        'tokenRange': [10, 13],
        loc: loc(4, 11, 4, 18),
        'type': 'property'
      });

      assert.deepStrictEqual(expr('@id2.id2'), {
        object: {
          type: 'id',
          loc: loc(4, 11, 4, 15),
          id: new WordToken(3, '@id2', loc(4, 11, 4, 15), 10),
        },
        property: new WordToken(2, 'id2', loc(4, 16, 4, 19), 12),
        'tokenRange': [10, 13],
        loc: loc(4, 11, 4, 19),
        'type': 'property'
      });

      assert.deepStrictEqual(expr('id2[id2]'), {
        object: {
          type: 'id',
          loc: loc(4, 11, 4, 14),
          id: new WordToken(2, 'id2', loc(4, 11, 4, 14), 10),
        },
        index: {
          type: 'id',
          id: new WordToken(2, 'id2', loc(4, 15, 4, 18), 12),
          loc: loc(4, 15, 4, 18)
        },
        'tokenRange': [10, 14],
        loc: loc(4, 11, 4, 19),
        'type': 'member'
      });

      assert.deepStrictEqual(expr('@id2[id2]'), {
        object: {
          type: 'id',
          loc: loc(4, 11, 4, 15),
          id: new WordToken(3, '@id2', loc(4, 11, 4, 15), 10),
        },
        index: {
          type: 'id',
          id: new WordToken(2, 'id2', loc(4, 16, 4, 19), 12),
          loc: loc(4, 16, 4, 19)
        },
        'tokenRange': [10, 14],
        loc: loc(4, 11, 4, 20),
        'type': 'member'
      });

      assert.deepStrictEqual(expr('id2[id2].id3'), {
        object: {
          type: 'member',
          object: {
            type: 'id',
            id: new WordToken(2, 'id2', loc(4, 11, 4, 14), 10),
            loc: loc(4, 11, 4, 14)
          },
          index: {
            type: 'id',
            id: new WordToken(2, 'id2', loc(4, 15, 4, 18), 12),
            loc: loc(4, 15, 4, 18)
          },
          loc: loc(4, 11, 4, 19)
        },
        property: new WordToken(2, 'id3', loc(4, 20, 4, 23), 15),
        'tokenRange': [10, 16],
        loc: loc(4, 11, 4, 23),
        'type': 'property'
      });

      assert.deepStrictEqual(expr('@id2[id2].id3'), {
        object: {
          object: {
            type: 'id',
            id: new WordToken(3, '@id2', loc(4, 11, 4, 15), 10),
            loc: loc(4, 11, 4, 15)
          },
          index: {
            type: 'id',
            id: new WordToken(2, 'id2', loc(4, 16, 4, 19), 12),
            loc: loc(4, 16, 4, 19)
          },
          loc: loc(4, 11, 4, 20),
          type: 'member'
        },
        property: new WordToken(2, 'id3', loc(4, 21, 4, 24), 15),
        'tokenRange': [10, 16],
        loc: loc(4, 11, 4, 24),
        'type': 'property'
      });
    });

    it('assign should ok', function () {
      assert.deepStrictEqual(expr('id2 = 1'), {
        left: {
          'id': new WordToken(2, 'id2', loc(4, 11, 4, 14), 10),
          type: 'id',
          loc: loc(4, 11, 4, 14)
        },
        expr: {
          loc: loc(4, 17, 4, 18),
          tokenRange: [12, 13],
          type: 'number',
          value: new NumberLiteral('1', 'integer', loc(4, 17, 4, 18), 12)
        },
        'tokenRange': [10, 13],
        'type': 'assign'
      });

      assert.deepStrictEqual(expr('@id2 = 1'), {
        left: {
          'id': new WordToken(3, '@id2', loc(4, 11, 4, 15), 10),
          loc: loc(4, 11, 4, 15),
          type: 'id'
        },
        expr: {
          loc: loc(4, 18, 4, 19),
          tokenRange: [12, 13],
          type: 'number',
          value: new NumberLiteral('1', 'integer', loc(4, 18, 4, 19), 12)
        },
        'tokenRange': [10, 13],
        'type': 'assign'
      });

      assert.deepStrictEqual(expr('id2.id = 1'), {
        left: {
          object: {
            type: 'id', 
            id: new WordToken(2, 'id2', loc(4, 11, 4, 14), 10),
            loc: loc(4, 11, 4, 14)
          },
          property: new WordToken(2, 'id', loc(4, 15, 4, 17), 12),
          loc: loc(4, 11, 4, 18),
          type: 'property'
        },
        expr: {
          loc: loc(4, 20, 4, 21),
          tokenRange: [14, 15],
          type: 'number',
          value: new NumberLiteral('1', 'integer', loc(4, 20, 4, 21), 14)
        },
        'tokenRange': [10, 15],
        'type': 'assign'
      });

      assert.deepStrictEqual(expr('@id2.id = 1'), {
        left: {
          object: {
            type: 'id', 
            id: new WordToken(3, '@id2', loc(4, 11, 4, 15), 10),
            loc: loc(4, 11, 4, 15)
          },
          property: new WordToken(2, 'id', loc(4, 16, 4, 18), 12),
          loc: loc(4, 11, 4, 19),
          type: 'property'
        },
        expr: {
          loc: loc(4, 21, 4, 22),
          tokenRange: [14, 15],
          type: 'number',
          value: new NumberLiteral('1', 'integer', loc(4, 21, 4, 22), 14)
        },
        'tokenRange': [10, 15],
        'type': 'assign'
      });

      assert.deepStrictEqual(expr('id2[id] = 1'), {
        left: {
          object: {
            type: 'id',
            id: new WordToken(2, 'id2', loc(4, 11, 4, 14), 10),
            loc: loc(4, 11, 4, 14)
          },
          index: {
            type: 'id',
            id: new WordToken(2, 'id', loc(4, 15, 4, 17), 12),
            loc: loc(4, 15, 4, 17)
          },
          loc: loc(4, 11, 4, 19),
          type: 'member'
        },
        expr: {
          loc: loc(4, 21, 4, 22),
          tokenRange: [15, 16],
          type: 'number',
          value: new NumberLiteral('1', 'integer', loc(4, 21, 4, 22), 15)
        },
        'tokenRange': [10, 16],
        'type': 'assign'
      });

      assert.deepStrictEqual(expr('@id2[id] = 1'), {
        left: {
          object: {
            type: 'id',
            id: new WordToken(3, '@id2', loc(4, 11, 4, 15), 10),
            loc: loc(4, 11, 4, 15)
          },
          index: {
            type: 'id',

            id: new WordToken(2, 'id', loc(4, 16, 4, 18), 12),
            loc: loc(4, 16, 4, 18)
          },
          loc: loc(4, 11, 4, 20),
          type: 'member'
        },
        expr: {
          loc: loc(4, 22, 4, 23),
          tokenRange: [15, 16],
          type: 'number',
          value: new NumberLiteral('1', 'integer', loc(4, 22, 4, 23), 15)
        },
        'tokenRange': [10, 16],
        'type': 'assign'
      });
    });

    it('method call should ok', function () {
      assert.deepStrictEqual(expr('id2()'), {
        callee: {
          type: 'id',
          id: new WordToken(2, 'id2', loc(4, 11, 4, 14), 10),
          loc: loc(4, 11, 4, 14)
        },
        args: [],
        'tokenRange': [10, 13],
        loc: loc(4, 11, 4, 16),
        'type': 'call'
      });
    });

    it('call should ok', function () {
      assert.deepStrictEqual(expr('id2.id2()'), {
        callee: {
          type: 'property',
          property: new WordToken(2, 'id2', loc(4, 15, 4, 18), 12),
          object: {
            type: 'id',
            id: new WordToken(2, 'id2', loc(4, 11, 4, 14), 10),
            loc: loc(4, 11, 4, 14)
          },
          loc: loc(4, 11, 4, 18)
        },
        args: [],
        'tokenRange': [10, 15],
        loc: loc(4, 11, 4, 20),
        'type': 'call'
      });
    });

    it('args should ok', function () {
      assert.deepStrictEqual(expr('id2()').args, []);
      assert.deepStrictEqual(expr('id2(1)').args, [
        {
          type: 'number',
          loc: loc(4, 15, 4, 16),
          tokenRange: [12, 13],
          value: new NumberLiteral('1', 'integer', loc(4, 15, 4, 16), 12)
        }
      ]);
      assert.deepStrictEqual(expr('id2(1, 2)').args, [
        {
          type: 'number',
          loc: loc(4, 15, 4, 16),
          tokenRange: [12, 13],
          value: new NumberLiteral('1', 'integer', loc(4, 15, 4, 16), 12)
        },
        {
          type: 'number',
          loc: loc(4, 18, 4, 19),
          tokenRange: [14, 15],
          value: new NumberLiteral('2', 'integer', loc(4, 18, 4, 19), 14)
        }
      ]);
    });

    it('and should ok', function () {
      assert.deepStrictEqual(expr('id && id2'), {
        loc: loc(4, 11, 4, 20),
        type: 'logical',
        'operator': '&&',
        tokenRange: [10, 13],
        left: {
          type: 'id',
          id: new WordToken(2, 'id', loc(4, 11, 4, 13), 10),
          loc: loc(4, 11, 4, 13),
        },
        right: {
          type: 'id',
          id: new WordToken(2, 'id2', loc(4, 17, 4, 20), 12),
          loc: loc(4, 17, 4, 20),
          tokenRange: [12, 13]
        }
      });
    });

    it('or should ok', function () {
      assert.deepStrictEqual(expr('id || id2'), {
        loc: loc(4, 11, 4, 20),
        type: 'logical',
        operator: '||',
        tokenRange: [10, 13],
        left: {
          type: 'id',
          id: new WordToken(2, 'id', loc(4, 11, 4, 13), 10),
          loc: loc(4, 11, 4, 13),
        },
        right: {
          type: 'id',
          id: new WordToken(2, 'id2', loc(4, 17, 4, 20), 12),
          loc: loc(4, 17, 4, 20),
          tokenRange: [12, 13]
        }
      });
    });

    it('not expr should ok', function () {
      assert.deepStrictEqual(expr('!id2'), {
        type: 'not',
        tokenRange: [10, 12],
        loc: loc(4, 11, 4, 15),
        expr: {
          type: 'id',
          id: new WordToken(2, 'id2', loc(4, 12, 4, 15), 11),
          loc: loc(4, 12, 4, 15)
        }
      });
    });

    it('< should ok', function () {
      assert.deepStrictEqual(expr('id < id2'), {
        loc: loc(4, 11, 4, 19),
        type: 'binary',
        'operator': '<',
        tokenRange: [10, 13],
        left: {
          type: 'id',
          id: new WordToken(2, 'id', loc(4, 11, 4, 13), 10),
          loc: loc(4, 11, 4, 13),
        },
        right: {
          type: 'id',
          id: new WordToken(2, 'id2', loc(4, 16, 4, 19), 12),
          loc: loc(4, 16, 4, 19),
          tokenRange: [12, 13]
        }
      });
    });

    it('<= should ok', function () {
      assert.deepStrictEqual(expr('id <= id2'), {
        loc: loc(4, 11, 4, 20),
        type: 'binary',
        'operator': '<=',
        tokenRange: [10, 13],
        left: {
          type: 'id',
          id: new WordToken(2, 'id', loc(4, 11, 4, 13), 10),
          loc: loc(4, 11, 4, 13),
        },
        right: {
          type: 'id',
          id: new WordToken(2, 'id2', loc(4, 17, 4, 20), 12),
          loc: loc(4, 17, 4, 20),
          tokenRange: [12, 13]
        }
      });
    });

    it('> should ok', function () {
      assert.deepStrictEqual(expr('id > id2'), {
        loc: loc(4, 11, 4, 19),
        type: 'binary',
        'operator': '>',
        tokenRange: [10, 13],
        left: {
          type: 'id',
          id: new WordToken(2, 'id', loc(4, 11, 4, 13), 10),
          loc: loc(4, 11, 4, 13),
        },
        right: {
          type: 'id',
          id: new WordToken(2, 'id2', loc(4, 16, 4, 19), 12),
          loc: loc(4, 16, 4, 19),
          tokenRange: [12, 13]
        }
      });
    });

    it('>= should ok', function () {
      assert.deepStrictEqual(expr('id >= id2'), {
        loc: loc(4, 11, 4, 20),
        type: 'binary',
        'operator': '>=',
        tokenRange: [10, 13],
        left: {
          type: 'id',
          id: new WordToken(2, 'id', loc(4, 11, 4, 13), 10),
          loc: loc(4, 11, 4, 13),
        },
        right: {
          type: 'id',
          id: new WordToken(2, 'id2', loc(4, 17, 4, 20), 12),
          loc: loc(4, 17, 4, 20),
          tokenRange: [12, 13]
        }
      });
    });

    it(`to expr should ok`, function () {
      assert.deepStrictEqual(expr('id to Model'), {
        type: 'to',
        tokenRange: [10, 13],
        loc: loc(4, 11, 4, 22),
        from: {
          type: 'id',
          id: new WordToken(2, 'id', loc(4, 11, 4, 13), 10),
          loc: loc(4, 11, 4, 13)
        },
        to: new WordToken(2, 'Model', loc(4, 17, 4, 22), 12)
      });

      assert.deepStrictEqual(expr('id to $pkg.Model'), {
        type: 'to',
        tokenRange: [10, 15],
        loc: loc(4, 11, 4, 27),
        from: {
          type: 'id',
          id: new WordToken(2, 'id', loc(4, 11, 4, 13), 10),
          loc: loc(4, 11, 4, 13)
        },
        to: {
          type: 'extern_component',
          aliasId: new WordToken(21, '$pkg', loc(4, 17, 4, 21), 12),
          component: new WordToken(2, 'Model', loc(4, 22, 4, 27), 14),
          loc: loc(4, 17, 4, 27),
          tokenRange: [12, 15]
        }
      });

      assert.throws(() => {
        expr('id to 123');
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'Unexpected token: Number: 123. expect (extern) module/model/interface');
        return true;
      });
    });

    it(`inline call expr should ok`, function () {
      assert.deepStrictEqual(expr('#append(list, item)'), {
        type: 'inline',
        tokenRange: [10, 16],
        loc: loc(4, 18, 4, 30),
        args: [
          {
            type: 'id',
            id: new WordToken(2, 'list', loc(4, 19, 4, 23), 12),
            loc: loc(4, 19, 4, 23),
            tokenRange: [12, 13]
          },
          {
            type: 'id',
            id: new WordToken(2, 'item', loc(4, 25, 4, 29), 14),
            loc: loc(4, 25, 4, 29),
            tokenRange: [14, 15]
          }
        ],
        name: new WordToken(36, '#append', loc(4, 11, 4, 18), 10)
      });
    });
  });
});
