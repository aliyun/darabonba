'use strict';

const assert = require('assert');

const Parser = require('../lib/parser');
const Lexer = require('../lib/lexer');
const {
  WordToken, 
  StringLiteral, 
  Annotation, 
  Comment } = require('../lib/tokens');

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

describe('parser', function () {

  it('empty model should not ok', function () {
    assert.throws(() => {
      parse('', '__filename');
    }, (err) => {
      assert.ok(err instanceof SyntaxError);
      assert.deepStrictEqual(err.message, `Unexpected token: EOF. expect 'module', 'model', 'interface' or 'main'`);
      return true;
    });
  });

  it('model should be ok', function () {
    assert.throws(() => {
      parse(`model`, '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: EOF. Expect ID, but EOF`);
      return true;
    });

    assert.throws(() => {
      parse('model id {', '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: EOF. only id is allowed`);
      return true;
    });

    assert.deepStrictEqual(parse('model id {}', '__filename'), {
      imports: [],
      annotation: undefined,
      comments: new Map(),
      modelBody: {
        'nodes': [],
        'tokenRange': [2, 3],
        'type': 'modelBody'
      },
      'name': new WordToken(2, 'id', loc(1, 7, 1, 9), 1),
      'tokenRange': [0, 4],
      'type': 'model',
    });
  });

  it('model field should be ok', function () {
    assert.throws(() => {
      parse(`model id {?}`, '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: ?. only id is allowed`);
      return true;
    });

    assert.throws(() => {
      parse(`model id { name }`, '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: }. Expect :, but }`);
      return true;
    });

    assert.throws(() => {
      parse(`model id { name? }`, '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: }. Expect :, but }`);
      return true;
    });

    assert.throws(() => {
      parse(`model id { name?: }`, '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: }. expect base type, model id or array form`);
      return true;
    });

    assert.deepStrictEqual(parse(`model id { name?: string }`, '__filename'), {
      type: 'model',
      tokenRange: [0, 8],
      annotation: undefined,
      comments: new Map(),
      imports: [],
      modelBody: {
        'nodes': [
          {
            'attrs': [],
            'fieldName': new WordToken(2, 'name', loc(1, 12, 1, 16), 3),
            'fieldType': new WordToken(8, 'string', loc(1, 19, 1, 25), 6),
            'required': false,
            'tokenRange': [3, 7],
            'type': 'modelField'
          }
        ],
        'tokenRange': [2, 7],
        'type': 'modelBody'
      },
      name: new WordToken(2, 'id', loc(1, 7, 1, 9), 1)
    });

    assert.deepStrictEqual(parse(`model id { object?: string }`, __filename).modelBody, {
      nodes: [
        {
          'attrs': [],
          'fieldName': new WordToken(2, 'object', loc(1, 12, 1, 18), 3),
          'fieldType': new WordToken(8, 'string', loc(1, 21, 1, 27), 6),
          'required': false,
          'tokenRange': [3, 7],
          'type': 'modelField'
        }
      ],
      'tokenRange': [2, 7],
      'type': 'modelBody'
    });

    assert.deepStrictEqual(parse(`model id { name?: ID }`, '__filename').modelBody.nodes, [
      {
        'attrs': [],
        'fieldName': new WordToken(2, 'name', loc(1, 12, 1, 16), 3),
        'fieldType': new WordToken(2, 'ID', loc(1, 19, 1, 21), 6),
        'tokenRange': [3, 7],
        'required': false,
        'type': 'modelField'
      }
    ]);

    assert.deepStrictEqual(parse(`model id { name?: $Pack.M }`, '__filename').modelBody.nodes, [
      {
        'attrs': [],
        'fieldName': new WordToken(2, 'name', loc(1, 12, 1, 16), 3),
        'fieldType': {
          type: 'extern_component',
          aliasId: new WordToken(21, '$Pack', loc(1, 19, 1, 24), 6),
          component: new WordToken(2, 'M', loc(1, 25, 1, 26), 8),
          loc: loc(1, 19, 1, 26),
          tokenRange: [6, 9]
        },
        'tokenRange': [3, 9],
        'required': false,
        'type': 'modelField'
      }
    ]);

    assert.throws(() => {
      parse(`model id { name?: [ }`, '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: }. expect base type, model id or array form`);
      return true;
    });

    assert.deepStrictEqual(parse(`model id { name?: [ string ] }`, '__filename').modelBody.nodes, [
      {
        'attrs': [],
        'fieldName': new WordToken(2, 'name', loc(1, 12, 1, 16), 3),
        'fieldType': {
          'type': 'array',
          'itemType': new WordToken(8, 'string', loc(1, 21, 1, 27), 7)
        },
        'tokenRange': [3, 9],
        'required': false,
        'type': 'modelField'
      }
    ]);

    assert.deepStrictEqual(parse(`model id { name: string, }`, '__filename').modelBody.nodes, [
      {
        'attrs': [],
        'fieldName': new WordToken(2, 'name', loc(1, 12, 1, 16), 3),
        'fieldType': new WordToken(8, 'string', loc(1, 18, 1, 24), 5),
        'required': true,
        'tokenRange': [3, 6],
        'type': 'modelField'
      }
    ]);

    assert.deepStrictEqual(parse(`model id { name: [ map[string]any ], }`, '__filename').modelBody.nodes, [
      {
        'attrs': [],
        'fieldName': new WordToken(2, 'name', loc(1, 12, 1, 16), 3),
        'fieldType': {
          'itemType': {
            'keyType': new WordToken(8, 'string', loc(1, 24, 1, 30), 8),
            'type': 'map',
            'valueType': new WordToken(8, 'any', loc(1, 31, 1, 34), 10),
            loc: loc(1, 20, 1, 34)
          },
          'type': 'array'
        },
        'tokenRange': [3, 12],
        'required': true,
        'type': 'modelField'
      }
    ]);

    assert.deepStrictEqual(parse(`model id { name?: string, name2: string }`, '__filename').modelBody.nodes, [
      {
        'attrs': [],
        'fieldName': new WordToken(2, 'name', loc(1, 12, 1, 16), 3),
        'fieldType': new WordToken(8, 'string', loc(1, 19, 1, 25), 6),
        'tokenRange': [3, 7],
        'required': false,
        'type': 'modelField'
      },
      {
        'attrs': [],
        'fieldName': new WordToken(2, 'name2', loc(1, 27, 1, 32), 8),
        'fieldType': new WordToken(8, 'string', loc(1, 34, 1, 40), 10),
        'tokenRange': [8, 11],
        'required': true,
        'type': 'modelField'
      }
    ]);

    assert.deepStrictEqual(parse(`model id { name?: string, name2: string, }`, '__filenane').modelBody.nodes, [
      {
        'attrs': [],
        'fieldName': new WordToken(2, 'name', loc(1, 12, 1, 16), 3),
        'fieldType': new WordToken(8, 'string', loc(1, 19, 1, 25), 6),
        'tokenRange': [3, 7],
        'required': false,
        'type': 'modelField'
      },
      {
        'attrs': [],
        'fieldName': new WordToken(2, 'name2', loc(1, 27, 1, 32), 8),
        'fieldType': new WordToken(8, 'string', loc(1, 34, 1, 40), 10),
        'tokenRange': [8, 11],
        'required': true,
        'type': 'modelField'
      }
    ]);

    assert.deepStrictEqual(parse(`model id { string?: string }`, '__filename').modelBody.nodes, [
      {
        'attrs': [],
        'fieldName': new WordToken(2, 'string', loc(1, 12, 1, 18), 3),
        'fieldType': new WordToken(8, 'string', loc(1, 21, 1, 27), 6),
        'tokenRange': [3, 7],
        'required': false,
        'type': 'modelField'
      }
    ]);

    assert.throws(() => {
      parse(`model id { name: string { }`, '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: {. expect ","`);
      return true;
    });
  });

  it('model filed attrs should be ok', function () {
    assert.throws(() => {
      parse(`model id { name: string( }`, '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: }. Expect ID, but }`);
      return true;
    });

    assert.throws(() => {
      parse(`model id { name: string(id }`, '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: }. Expect =, but }`);
      return true;
    });

    assert.throws(() => {
      parse(`model id { name: string(id= }`, '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: }. expect string, number, bool`);
      return true;
    });

    assert.throws(() => {
      parse(`model id { name: string(id="attr_value" }`, '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: }. Expect ,, but }`);
      return true;
    });

    assert.throws(() => {
      parse(`model id { name: string(id="attr_value", }`, '__filename');
    }, function (e) { // get the exception object
      assert.ok(e instanceof SyntaxError);
      assert.deepStrictEqual(e.message, `Unexpected token: }. Expect ID, but }`);
      return true;
    });

    function modelFieldAttrs(value) {
      var ast = parse(`
        model id {
          name: string${value}
        }
      `, '__filename');
      return ast.modelBody.nodes[0].attrs;
    }

    assert.deepStrictEqual(modelFieldAttrs(`(id="attr_value")`), [
      {
        'attrName': new WordToken(2, 'id', loc(3, 24, 3, 26), 7),
        'attrValue': new StringLiteral('attr_value', loc(3, 28, 3, 38), 9),
        'type': 'attr'
      }
    ]);

    assert.deepStrictEqual(modelFieldAttrs('(id="attr_value",id2="value2")'), [
      {
        'attrName': new WordToken(2, 'id', loc(3, 24, 3, 26), 7),
        'attrValue': new StringLiteral('attr_value', loc(3, 28, 3, 38), 9),
        'type': 'attr'
      },
      {
        'attrName': new WordToken(2, 'id2', loc(3, 40, 3, 43), 11),
        'attrValue': new StringLiteral('value2', loc(3, 45, 3, 51), 13),
        'type': 'attr'
      }
    ]);
  });

  it('multi-dimentional array in model field should be ok', function () {
    function modelField(value) {
      var ast = parse(`
        model id {
          ${value}
        }
      `, '__filename');
      return ast.modelBody.nodes;
    }

    assert.deepStrictEqual(modelField(`name?: [[ string ]]`), [
      {
        'type': 'modelField',
        'fieldName': new WordToken(2, 'name', loc(3, 11, 3, 15), 3),
        'required': false,
        'fieldType': {
          'type': 'array',
          'itemType': {
            'type': 'array',
            'itemType': new WordToken(8, 'string', loc(3, 21, 3, 27), 8)
          }
        },
        'attrs': [],
        'tokenRange': [3, 11]
      }
    ]);

    assert.deepStrictEqual(modelField(`name?: [[[ string ]]]`), [
      {
        'type': 'modelField',
        'fieldName': new WordToken(2, 'name', loc(3, 11, 3, 15), 3),
        'required': false,
        'fieldType': {
          'type': 'array',
          'itemType': {
            'type': 'array',
            'itemType': {
              'type': 'array',
              'itemType': new WordToken(8, 'string', loc(3, 22, 3, 28), 9)
            }
          }
        },
        'attrs': [],
        'tokenRange': [3, 13]
      }
    ]);
  });

  it('import should ok', function () {
    var ast = parse(`import $oss;
        model id {}
`, '__filename');
    assert.deepStrictEqual(ast.imports, [
      {
        type: 'import',
        aliasId: new WordToken(21, '$oss', loc(1, 8, 1, 12), 1),
        tokenRange: [0, 3]
      }
    ]);
  });

  it('model annotation should be ok', function () {
    var ast = parse(`
    /**
     * model annotation
     */
    model M {}
  `, '__filename');

    assert.deepStrictEqual(ast, {
      'type': 'model',
      'imports': [],
      'name': new WordToken(2, 'M', loc(5, 11, 5, 12), 2),
      modelBody: {
        'nodes': [],
        'type': 'modelBody',
        tokenRange: [3, 4]
      },
      comments: new Map(),
      tokenRange: [1, 5],
      'annotation': new Annotation('/**\n     * model annotation\n     */', loc(2, 5, 4, 8), 0)
    });
  });

  it('comment about model should ok', function () {
    var ast = parse(`
    // front model comment
    model M {
      // empty model
    }
    // back model comment
    `, '__filename');
    const comments = new Map();
    comments.set(1, new Comment('// front model comment', loc(2, 5, 2, 27), 0));
    comments.set(5, new Comment('// empty model', loc(4, 7, 4, 21), 4));
    comments.set(7, new Comment('// back model comment', loc(6, 5, 6, 26), 6));
    assert.deepStrictEqual(ast, {
      'type': 'model',
      'annotation': undefined,
      'tokenRange': [1, 7],
      'comments': comments,
      imports: [],
      modelBody: {
        'nodes': [],
        'tokenRange': [3, 5],
        'type': 'modelBody'
      },
      'name': new WordToken(2, 'M', loc(3, 11, 3, 12), 2)
    });
  });

  it('word(function) as model field name should ok', function () {
    assert.doesNotThrow(function () {
      parse(`
      model M {
        function: string
      }
    `, '__filename');
    });
  });
});
