'use strict';
const path = require('path');
const fs = require('fs');

const expect = require('expect.js');

const { parse } = require('..');

function readAndParse(specPath) {
  const filePath = path.join(__dirname, specPath);
  return parse(fs.readFileSync(filePath, 'utf-8'), filePath);
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

// function string(val, sl, sc, el, ec) {
//   return {
//     'type': 'string',
//     'loc': loc(sl, sc, el, ec),
//     'value': {
//       'loc': loc(sl, sc, el, ec),
//       'string': val,
//       'tag': 1
//     }
//   };
// }

describe('semantic', function () {

  it('virtualVariable without type should not ok', function () {
    expect(() => {
      parse(`
        api id(): string {
          __request.method = "GET";
          __request.pathname = "/";
        } returns {
          var id = "";
          id = @vid;
        }`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the type "@vid" is undefined`);
    });
  });

  it('virtualVariable in object expand field without type should not ok', function () {
    expect(() => {
      parse(`
        api id(): string {
          __request.method = "GET";
          __request.pathname = "/";
        } returns {
          return {
            ...@vid
          };
        }`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the type "@vid" is undefined`);
    });
  });

  it('use undefined model in type should not ok', function () {
    expect(() => {
      parse(`
        model defined = {};
        type @ddd = defined
        type @id = modelname`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`model "modelname" undefined`);
    });

    expect(() => {
      parse(`
        model defined = {};
        type @call1 = defined
        type @call2 = modelname`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`model "modelname" undefined`);
    });

    expect(() => {
      parse(`
        model defined = {};
        type @call1 = defined
        type @call2 = map[string]modelname`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`model "modelname" undefined`);
    });
  });

  it('use model before define it should ok', function () {
    expect(() => {
      parse(`model defined2 = {
          key: defined
        };

        model defined = {};
      `, '__filename');
    }).to.not.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`model "modelname" undefined`);
    });
  });

  it('redefine type should not ok', function () {
    expect(() => {
      parse(`
        type @id = string
        type @id = string`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`redefined type "@id"`);
    });
  });

  it('redefine model should not ok', function () {
    expect(() => {
      parse(`
        model id = { key: string }
        model id = { key: string }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`redefined model "id"`);
    });
  });

  it('redefine api should not ok', function () {
    expect(() => {
      parse(`
        api getId(): string {
          method = 'GET';
          pathname = '/';
        }

        api getId(): string {
          method = 'GET';
          pathname = '/';
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`redefined api "getId"`);
    });
  });

  it('redefine function should not ok', function () {
    expect(() => {
      parse(`
        function f(): void {

        }
        function f(): void {

        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`redefined function "f"`);
    });
  });

  it('object vs model should ok', function () {
    expect(() => {
      parse(`
        static function toJSONString(i: object): string;
        model MyModel = {}
        init();
        api call(v: MyModel): object {
          __request.protocol = 'http';
          __request.port = 80;
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {};
          __request.headers = {};
          __request.query.key = 'value';
        } returns {
          return {
            id = toJSONString(v)
          };
        }`, '__filename');
    }).to.not.throwException();
  });

  it('const should be ok', function () {
    expect(() => {
      parse(`
        function xcall(a: string, b: string, c: string): string;
        model m = {b: string, a: number}
        const version = '2012';
        const n = 123;
        const b = true;
        api call(v: m): object {
          __request.protocol = 'http';
          __request.port = 80;
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {};
          __request.headers = {};
          __request.query.key = xcall(__module.version, __module.n, __module.b);
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the parameter ` +
        `types are mismatched. expected xcall(string, string, string), ` +
        `but xcall(string, number, boolean)`);
    });

    expect(() => {
      parse(`
        function xcall(a: string, b: string, c: string): string {
          return __module.x;
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the const x is undefined`);
    });
  });

  it('undefined variable should not ok', function () {
    expect(() => {
      parse(`
        api call(): object {
          __request.protocol = 'http';
          __request.port = the_port;
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {};
          __request.headers = {};
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`variable "the_port" undefined`);
    });

    expect(() => {
      parse(`
        api call(): object {
          __request.protocol = 'http';
          __request.port = the_port.b;
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {};
          __request.headers = {};
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`variable "the_port" undefined`);
    });
  });

  it('non-object as expand field should not ok', function () {
    expect(() => {
      parse(`
        api call(a: string): object {
          __request.protocol = 'http';
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {
            ...a
          };
          __request.headers = {};
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the expand field "a" should be an object or model`);
    });

    expect(() => {
      parse(`
        model m = {};
        init();
        api call(a: m): object {
          __request.protocol = 'http';
          __request.method = 'GET';
          __request.pathname = '/';
          __request.headers = {};
        } returns {
          var query = {
            ...a
          };
        }`, '__filename');
    }).to.not.throwException();
  });

  it('duplicate parameter name should not ok', function () {
    expect(() => {
      parse(`
        type @id = string
        api call(a: string, a: string): object {
          __request.protocol = 'http';
          __request.port = 80;
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {};
          __request.headers = {};
          __request.query.key = 'value';
        } returns {
          return {
            id = xcall(@id)
          };
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`redefined parameter "a"`);
    });
  });

  it('non-object/model property access should not ok', function () {
    expect(() => {
      parse(`
        api call(a: string): object {
          __request.protocol = 'http';
          __request.port = 80;
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {};
          __request.headers = {};
          __request.query.key = 'value';
        } returns {
          var c = a.b;
          return {};
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`The type of 'a' must be model, object or map`);
    });
  });

  it('undefined property should not ok', function () {
    expect(() => {
      parse(`
        model m = {};
        api call(a: m): object {
          __request.protocol = 'http';
          __request.port = 80;
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {};
          __request.headers = {};
          __request.query.key = 'value';
        } returns {
          var c = a.b.c;
          return {};
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`The property b is undefined in model a(m)`);
    });

    expect(() => {
      parse(`
        model m = {};
        api call(a: map[string]m): object {
          __request.protocol = 'http';
          __request.port = 80;
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {};
          __request.headers = {};
          __request.query.key = 'value';
        } returns {
          var c = a.b.c;
          return {};
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`The property c is undefined in model a.b(m)`);
    });
  });

  it('undefined model should not ok', function () {
    expect(() => {
      parse(`
        api call(val: modelname): object {
          __request.protocol = 'http';
          __request.port = 80;
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {};
          __request.headers = {};
          __request.query.key = 'value';
        } returns {
          return {
            id = xcall(@id)
          };
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`model "modelname" undefined`);
    });

    expect(() => {
      parse(`
        model defined = {};
        api call(a: [string], b: [defined], val: [modelname]): object {
          __request.protocol = 'http';
          __request.port = 80;
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {};
          __request.headers = {};
          __request.query.key = 'value';
        } returns {
          return {
            id = xcall(@id)
          };
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`model "modelname" undefined`);
    });
  });

  it('runtime should not ok', function () {
    expect(() => {
      parse(`
        api call(val: string): object {
          __request.protocol = 'http';
          __request.port = 80;
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {};
          __request.headers = {};
          __request.query.key = 'value';
        } returns {
          return {};
        } runtime {
          ...val
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the expand field "val" should be an object or model`);
    });

    expect(() => {
      parse(`
        init();
        api call(val: object): object {
          __request.protocol = 'http';
          __request.port = 80;
          __request.method = 'GET';
          __request.pathname = '/';
          __request.query = {};
          __request.headers = {};
          __request.query.key = 'value';
        } returns {
          return {};
        } runtime {
          ...val
        }`, '__filename');
    }).to.not.throwException();
  });

  it('duplicate parameter name should not ok for function', function () {
    expect(() => {
      parse(`
        function callId(a: string, a: string): string {
          return id();
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`redefined parameter "a"`);
    });
  });

  it('call undefined api should not ok', function () {
    expect(() => {
      parse(`
        function callId(): string {
          return callx();
        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the api/function "callx" is undefined`);
    });
  });

  it('inferred for call in function should ok', function () {
    var ast = parse(`
        api call(): object {
          __request.method = 'GET';
          __request.pathname = '/';
        } returns {
          return {};
        }

        async function callId(): object {
          return call();
        }
        init();`, '__filename');
    var func = ast.moduleBody.nodes.find((item) => {
      return item.type === 'function';
    });
    var returnExpr = func.functionBody.stmts.stmts[0];
    expect(returnExpr).to.eql({
      type: 'return',
      'loc': loc(10, 11, 11, 9),
      'needCast': false,
      'tokenRange': [36, 40],
      expr: {
        type: 'call',
        'tokenRange': [37, 40],
        isStatic: false,
        isAsync: true,
        'hasThrow': true,
        left: {
          type: 'method_call',
          id: {
            'index': 37,
            tag: 2,
            'loc': loc(10, 18, 10, 22),
            lexeme: 'call'
          }
        },
        args: [],
        'inferred': {
          'keyType': { name: 'string', type: 'basic' },
          'type': 'map',
          'valueType': { name: 'any', type: 'basic' },
        },
        'loc': loc(10, 18, 10, 24)
      }
    });
  });

  it('submodel should ok', function () {
    var ast = parse(`
      model a = {
        b: {
          s: string
        }
      }`, '__filename');
    expect(ast.parserVersion).to.be.ok();
    const modelA = ast.models.a;
    expect(modelA).to.eql({
      'annotation': undefined,
      'modelBody': {
        'nodes': [
          {
            'attrs': [],
            'fieldName': {
              'index': 5,
              'lexeme': 'b',
              'loc': loc(3, 9, 3, 10),
              'tag': 2
            },
            'fieldValue': {
              'nodes': [
                {
                  'attrs': [],
                  'fieldName': {
                    'index': 8,
                    'lexeme': 's',
                    'loc': loc(4, 11, 4, 12),
                    'tag': 2
                  },
                  'fieldValue': {
                    'fieldType': 'string',
                    'type': 'fieldType'
                  },
                  'required': true,
                  'tokenRange': [8, 11],
                  'type': 'modelField'
                }
              ],
              'tokenRange': [7, 11],
              'type': 'modelBody'
            },
            'required': true,
            'tokenRange': [5, 12],
            'type': 'modelField'
          }
        ],
        'tokenRange': [4, 12],
        'type': 'modelBody'
      },
      'modelName': {
        'lexeme': 'a',
        // 'loc': {
        //   'end': {
        //     'column': 14,
        //     'line': 2
        //   },
        //   'start': {
        //     'column': 13,
        //     'line': 2
        //   }
        // },
        'tag': 2
      },
      'type': 'model'
    });
    const modelAB = ast.models['a.b'];
    expect(modelAB).to.eql({
      'annotation': undefined,
      'modelBody': {
        'nodes': [
          {
            'attrs': [],
            'fieldName': {
              'index': 8,
              'lexeme': 's',
              'loc': loc(4, 11, 4, 12),
              'tag': 2
            },
            'fieldValue': {
              'fieldType': 'string',
              'type': 'fieldType'
            },
            'required': true,
            'tokenRange': [8, 11],
            'type': 'modelField'
          }
        ],
        'tokenRange': [7, 11],
        'type': 'modelBody'
      },
      'modelName': {
        'lexeme': 'a.b',
        'tag': 2
      },
      'type': 'model'
    });
  });

  it('submodel with depth level should ok', function () {
    var ast = parse(`
      model GroupDetailResponse = {
        abilities: {
          read: boolean,
          update: boolean,
          destroy: boolean,
          group_user: {
            create: boolean,
            update: boolean,
            destroy: boolean
          },
          repo: {
            create: boolean,
            update: boolean,
            destroy: boolean
          }
        }
      }`, '__filename');

    const GroupDetailResponse = ast.models['GroupDetailResponse'];
    expect(GroupDetailResponse).to.be.ok();
    expect(ast.models['GroupDetailResponse.abilities']).to.be.ok();
    expect(ast.models['GroupDetailResponse.abilities.group_user']).to.be.ok();
    expect(ast.models['GroupDetailResponse.abilities.repo']).to.be.ok();
  });

  it('submodel with array should ok', function () {
    var ast = parse(`
      model GroupDetailResponse = {
        abilities: [
          {
            read: boolean,
            update: boolean,
            destroy: boolean,
          }
        ]
      }`, '__filename');

    const GroupDetailResponse = ast.models['GroupDetailResponse'];
    expect(GroupDetailResponse).to.be.ok();
    expect(ast.models['GroupDetailResponse.abilities']).to.be.ok();
    expect(ast.models['GroupDetailResponse.abilities']).to.eql({
      type: 'model',
      modelName: { tag: 2, lexeme: 'GroupDetailResponse.abilities' },
      'annotation': undefined,
      modelBody: {
        type: 'modelBody',
        'tokenRange': [8, 21],
        nodes: [
          {
            'attrs': [],
            'fieldName': {
              'index': 9,
              'lexeme': 'read',
              'loc': loc(5, 13, 5, 17),
              'tag': 2
            },
            'fieldValue': {
              'fieldType': 'boolean',
              'type': 'fieldType'
            },
            'required': true,
            'tokenRange': [9, 12],
            'type': 'modelField'
          },
          {
            'attrs': [],
            'fieldName': {
              'index': 13,
              'lexeme': 'update',
              'loc': loc(6, 13, 6, 19),
              'tag': 2
            },
            'fieldValue': {
              'fieldType': 'boolean',
              'type': 'fieldType'
            },
            'required': true,
            'tokenRange': [13, 16],
            'type': 'modelField'
          },
          {
            'attrs': [],
            'fieldName': {
              'index': 17,
              'lexeme': 'destroy',
              'loc': loc(7, 13, 7, 20),
              'tag': 2
            },
            'fieldValue': {
              'fieldType': 'boolean',
              'type': 'fieldType'
            },
            'required': true,
            'tokenRange': [17, 20],
            'type': 'modelField'
          }
        ]
      }
    });
  });

  it('submodel with another model should ok', function () {
    var ast = parse(`
      model b = {
        s: string
      };
      model a = {
        b: b,
        c: $Model
      }`, '__filename');
    expect(ast.parserVersion).to.be.ok();
    const modelA = ast.models.a;
    expect(modelA).to.eql({
      'annotation': undefined,
      'modelBody': {
        'nodes': [
          {
            'attrs': [],
            'fieldName': {
              'index': 14,
              'lexeme': 'b',
              'loc': loc(6, 9, 6, 10),
              'tag': 2
            },
            'fieldValue': {
              'type': 'fieldType',
              'fieldType': {
                'index': 16,
                'idType': 'model',
                'lexeme': 'b',
                'loc': loc(6, 12, 6, 13),
                'tag': 2
              }
            },
            'required': true,
            'tokenRange': [14, 17],
            'type': 'modelField'
          },
          {
            'attrs': [],
            'fieldName': {
              'index': 18,
              'lexeme': 'c',
              'loc': loc(7, 9, 7, 10),
              'tag': 2
            },
            'fieldValue': {
              'fieldType': {
                'index': 20,
                'idType': 'builtin_model',
                'lexeme': '$Model',
                'loc': loc(7, 12, 7, 18),
                'tag': 2
              },
              'type': 'fieldType'
            },
            'required': true,
            'tokenRange': [18, 21],
            'type': 'modelField'
          }
        ],
        'tokenRange': [13, 21],
        'type': 'modelBody'
      },
      'modelName': {
        'lexeme': 'a',
        'tag': 2
      },
      'type': 'model'
    });
    const modelB = ast.models.b;
    expect(modelB).to.eql({
      'annotation': undefined,
      'modelBody': {
        'nodes': [
          {
            'attrs': [],
            'fieldName': {
              'index': 5,
              'lexeme': 's',
              'loc': loc(3, 9, 3, 10),
              'tag': 2
            },
            'fieldValue': {
              'fieldType': 'string',
              'type': 'fieldType'
            },
            'required': true,
            'tokenRange': [5, 8],
            'type': 'modelField'
          }
        ],
        'tokenRange': [4, 8],
        'type': 'modelBody'
      },
      'modelName': {
        'lexeme': 'b',
        'tag': 2
      },
      'type': 'model'
    });
  });

  it('submodel as return type should ok', function () {
    expect(() => {
      parse(`
        model GroupDetailResponse = {
          abilities: [
            {
              read: boolean,
              update: boolean,
              destroy: boolean,
            }
          ]
        }

        static function test(): GroupDetailResponse.abilities {

        }`, '__filename');
    }).to.not.throwError();

    expect(() => {
      parse(`
        model GroupDetailResponse = {
          abilities: [
            {
              read: boolean,
              update: boolean,
              destroy: boolean,
            }
          ]
        }

        static function test(): GroupDetailResponse.inexist {

        }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the submodel GroupDetailResponse.inexist is inexist`);
    });
  });

  it('flatModel with array[basic type] should ok', function () {
    var ast = parse(`
      model GroupDetailResponse = {
        abilities: [
          string
        ]
      }`, '__filename');

    const GroupDetailResponse = ast.models['GroupDetailResponse'];
    expect(GroupDetailResponse).to.be.eql({
      'annotation': undefined,
      'modelBody': {
        'nodes': [
          {
            'attrs': [],
            'fieldName': {
              'index': 5,
              'lexeme': 'abilities',
              'loc': loc(3, 9, 3, 18),
              'tag': 2
            },
            'fieldValue': {
              'fieldItemType': {
                'index': 8,
                'lexeme': 'string',
                'loc': loc(4, 11, 4, 17),
                'tag': 8
              },
              'fieldType': 'array',
              'type': 'fieldType'
            },
            'required': true,
            'tokenRange': [5, 10],
            'type': 'modelField'
          }
        ],
        'tokenRange': [4, 10],
        'type': 'modelBody'
      },
      'modelName': {
        'lexeme': 'GroupDetailResponse',
        'tag': 2
      },
      'type': 'model'
    });

    const GroupDetailResponseabilities = ast.models['GroupDetailResponse.abilities'];
    expect(GroupDetailResponseabilities).to.not.be.ok();
  });

  it('parameters should ok', function () {
    expect(function () {
      parse(`
        api get(path: string): string {
          __request.method = 'GET';
          __request.pathname = '/';
        }

        async function getObject(): string {
          return get();
        }`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the parameters are mismatched, expect 1 parameters, actual 0`);
    });
  });

  it('init should only one should ok', function () {
    expect(function () {
      parse(`
        init();
        init();`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Only one init can be allowed.`);
    });
  });

  it('declare duplicated should not ok', function () {
    expect(function () {
      parse(`
        function callOSS(): string {
          var id = "id";
          var id = "id";
          return "";
        }`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the id "id" was defined`);
    });
  });

  it('declare duplicated in api should not ok', function () {
    expect(function () {
      parse(`
        api callOSS(): string {
          var id = "id";
          var id = "id";
          method = "GET";
          pathname = "/";
        }`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the id "id" was defined`);
    });
  });

  it('declare with model should ok', function () {
    expect(function () {
      parse(`
        model M {}
        static function callOSS(): void {
          var id: M = new M{};
        }`, '__filename');
    }).to.not.throwException();
  });

  it('declare with subModel should ok', function () {
    expect(function () {
      parse(`
        model M {
          N: {}
        }
        static function callOSS(): void {
          var id: M.N = new M.N{};
        }`, '__filename');
    }).to.not.throwException();
  });

  it('declare null without type should not ok', function () {
    expect(function () {
      parse(`
        static function callOSS(): void {
          var id = null;
        }`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`must declare type when value is null`);
    });
  });

  it('declare null with type should ok', function () {
    expect(function () {
      parse(`
        static function callOSS(): void {
          var id: string = null;
        }`, '__filename');
    }).to.not.throwException();
  });

  it('declare null with model should ok', function () {
    expect(function () {
      parse(`
        model M {}
        static function callOSS(): void {
          var id: M = null;
        }`, '__filename');
    }).to.not.throwException();
  });

  it('declare null with subModel should ok', function () {
    expect(function () {
      parse(`
        model M {
          N: {}
        }
        static function callOSS(): void {
          var id: M.N = null;
        }`, '__filename');
    }).to.not.throwException();
  });

  it('declare with moduleModel should ok', function () {
    expect(function () {
      readAndParse('fixtures/declare_module_model/main.dara');
    }).to.not.throwException();
  });

  it('declare variable with mismatched type should not ok', function () {
    expect(function () {
      parse(`
        static function callOSS(): void {
          var id : string = true;
        }`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`declared variable with mismatched type, expected: string, actual: boolean`);
    });
  });

  it('use undefined variable should not ok', function () {
    expect(function () {
      parse(`
        function call(): string {
          return id;
        }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`variable "id" undefined`);
    });
  });

  it('array with undefined variable should not ok', function () {
    expect(function () {
      parse(`
        function call(): [string] {
          return [id, id2];
        }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`variable "id" undefined`);
    });
  });

  it('redefined field in model should not ok', function () {
    expect(function () {
      parse(`
        model M = {
          a: string,
          a: string
        }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`redefined field "a" in model "M"`);
    });
  });

  it('undefined type in model should not ok', function () {
    expect(function () {
      parse(`
        model M = {
          a: json
        }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the type "json" is undefined`);
    });

    expect(function () {
      parse(`
        model M = {
          a: [ json ]
        }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the type "json" is undefined`);
    });
  });

  it('static method with virtual variable should not ok', function () {
    expect(function () {
      parse(`
        type @call = void

        static function func(): void {
          return @call;
        }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`virtual variable can not used in static function`);
    });
  });

  it('api in sync function should not ok', function () {
    expect(function () {
      parse(`
        api test(): void {
          __request.method = 'GET';
          __request.pathname = '/';
        }

        function sf(): void {
          return test();
        }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the api only can be used in async function`);
    });
  });

  it('async function in sync function should not ok', function () {
    expect(function () {
      parse(`
        async function af(): void {
        }

        function sf(): void {
          return af();
        }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the async function only can be used in async function`);
    });
  });

  it('parameter check for call should ok', function () {
    expect(function () {
      parse(`
        model M = {}

        static function test(m: M): void {
        }

        static function func(): void {
          return test("");
        }`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the parameter types are mismatched. expected test(M), but test(string)`);
    });

    expect(function () {
      parse(`
        model M = {}

        static function test(m: M): void {
        }

        static function func(): void {
          return test(new M);
        }`, '__filename');
    }).to.not.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the parameter types are mismatched. expected test(M), but test(string)`);
    });

    expect(function () {
      parse(`
        model M = {}

        function test(m: class): void {
        }

        function func(): void {
          return test("");
        }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the parameter types are mismatched. expected test(class), but test(string)`);
    });
  });

  it('add need cast for argument should ok', function () {
    const ast = parse(`      model M = {}

      function test(m: M): void {

      }

      function func(): void {
        return test({});
      }
      init();
    `, '__filename');

    const func = ast.moduleBody.nodes[2];
    expect(func).to.be.eql({
      'annotation': undefined,
      'isStatic': false,
      'isAsync': false,
      'hasThrow': false,
      'params': {
        'params': [],
        'type': 'params',
      },
      'returnType': {
        'index': 22,
        'lexeme': 'void',
        'loc': loc(7, 24, 7, 28),
        'tag': 8
      },
      'tokenRange': [17, 31],
      'type': 'function',
      'functionBody': {
        'loc': loc(7, 29, 10, 11),
        'stmts': {
          'stmts': [
            {
              'expr': {
                'args': [
                  {
                    'fields': [],
                    'inferred': {
                      'keyType': { name: 'string', type: 'basic' },
                      'type': 'map',
                      'valueType': { name: 'any', type: 'basic' },
                    },
                    'needCast': false,
                    'tokenRange': [27, 29],
                    'type': 'object',
                    loc: loc(8, 21, 8, 23)
                  }
                ],
                left: {
                  'type': 'method_call',
                  'id': {
                    'index': 25,
                    'lexeme': 'test',
                    'loc': loc(8, 16, 8, 20),
                    'tag': 2
                  },
                },
                'isAsync': false,
                'isStatic': false,
                'hasThrow': false,
                'inferred': {
                  'name': 'void',
                  'type': 'basic'
                },
                'tokenRange': [25, 30],
                'type': 'call',
                'loc': loc(8, 16, 8, 24)
              },
              'needCast': false,
              'tokenRange': [24, 30],
              'type': 'return',
              'loc': loc(8, 9, 9, 7)
            }
          ],
          'tokenRange': [23, 31],
          'type': 'stmts'
        },
        'tokenRange': [23, 31],
        'type': 'functionBody'
      },
      'functionName': {
        'index': 18,
        'lexeme': 'func',
        'loc': loc(7, 16, 7, 20),
        'tag': 2
      }
    });
  });

  it('return null should ok', function () {
    const ast = parse(`
      model M = {}
      function func(): M {
        return null;
      }
      init();`, '__filename');

    const func = ast.moduleBody.nodes[1];
    expect(func).to.be.eql({
      'annotation': undefined,
      'isStatic': false,
      'isAsync': false,
      'hasThrow': false,
      'params': {
        'params': [],
        'type': 'params',
      },
      'returnType': {
        'idType': 'model',
        'index': 11,
        'lexeme': 'M',
        'loc': loc(3, 24, 3, 25),
        'tag': 2
      },
      'type': 'function',
      'tokenRange': [6, 16],
      'functionBody': {
        'loc': loc(3, 26, 6, 11),
        'stmts': {
          'stmts': [
            {
              'expr': {
                'type': 'null',
                'inferred': {
                  'type': 'basic',
                  'name': 'null'
                },
                'tokenRange': [14, 15],
              },
              'needCast': false,
              'tokenRange': [13, 15],
              'type': 'return',
              'loc': loc(4, 9, 5, 7)
            }
          ],
          'tokenRange': [12, 16],
          'type': 'stmts'
        },
        'tokenRange': [12, 16],
        'type': 'functionBody'
      },
      'functionName': {
        'index': 7,
        'lexeme': 'func',
        'loc': loc(3, 16, 3, 20),
        'tag': 2
      }
    });
  });

  it('must have init when there is non-static function or api', function () {
    expect(function () {
      parse(`
      function test(): void {

      }`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Must have a init when there is a api or non-static function`);
    });

    expect(function () {
      parse(`
      init();
      function test(): void {

      }`, '__filename');
    }).to.not.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Must have a init when there is a api or non-static function`);
    });
  });

  it('undefined vid in assign expr should not ok', function () {
    expect(function () {
      parse(`
      function func(): void  {
        @id = "string";
      }`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the type "@id" is undefined`);
    });
  });

  it('try/catch/finally should ok', function () {
    var ast = parse(`
      static function print(a: string): void;

      static function func(): void  {
        try {
          print("try block");
        } catch (ex) {
          print(\`error message: \${ex.message}\`);
        } finally {
          print("finally block");
        }
      }`, '__filename');
    const [, func] = ast.moduleBody.nodes;
    expect(func.type).to.be('function');
    const [tryStmt] = func.functionBody.stmts.stmts;
    expect(tryStmt.type).to.be('try');
    expect(tryStmt.tryBlock).to.eql({
      'stmts': [
        {
          'args': [
            {
              'inferred': {
                'name': 'string',
                'type': 'basic'
              },
              'needCast': false,
              'tokenRange': [24, 25],
              'type': 'string',
              'value': {
                'index': 24,
                'string': 'try block',
                loc: loc(6, 18, 6, 27),
                'tag': 1
              },
              loc: loc(6, 18, 6, 27)
            }
          ],
          'inferred': {
            'name': 'void',
            'type': 'basic'
          },
          'loc': loc(6, 11, 6, 29),
          isAsync: false,
          isStatic: true,
          'hasThrow': false,
          'left': {
            'id': {
              'index': 22,
              'lexeme': 'print',
              'loc': loc(6, 11, 6, 16),
              'tag': 2
            },
            'type': 'method_call'
          },
          'tokenRange': [22, 26],
          'type': 'call'
        }
      ],
      'tokenRange': [21, 27],
      'type': 'stmts'
    });
    expect(tryStmt.catchId).to.eql({
      'index': 30,
      'lexeme': 'ex',
      'loc': {
        'end': {
          'column': 20,
          'line': 7
        },
        'start': {
          'column': 18,
          'line': 7
        }
      },
      'tag': 2
    });
    expect(tryStmt.catchBlock).to.eql({
      stmts: [
        {
          'args': [
            {
              'elements': [
                {
                  'type': 'element',
                  'value': {
                    'index': 35,
                    'loc': loc(8, 18, 8, 33),
                    'string': 'error message: ',
                    'tag': 12,
                    'tail': false
                  }
                },
                {
                  'expr': {
                    'id': {
                      'lexeme': 'ex',
                      loc: loc(8, 35, 8, 37),
                      'type': 'variable',
                      'tag': 2,
                      'index': 36,
                      'inferred': {
                        'moduleName': undefined,
                        'name': '$Error',
                        'type': 'model',
                      }
                    },
                    'propertyPath': [
                      {
                        'index': 38,
                        'lexeme': 'message',
                        'loc': loc(8, 38, 8, 45),
                        'tag': 2
                      }
                    ],
                    'propertyPathTypes': [
                      {
                        'name': 'string',
                        'type': 'basic'
                      }
                    ],
                    loc: loc(8, 35, 8, 47),
                    'tokenRange': [36, 39],
                    'type': 'property_access',
                    'inferred': {
                      'name': 'string',
                      'type': 'basic'
                    }
                  },
                  'type': 'expr'
                },
                {
                  'type': 'element',
                  'value': {
                    'index': 39,
                    'loc': loc(8, 46, 8, 46),
                    'string': '',
                    'tag': 12,
                    'tail': true
                  }
                }
              ],
              'inferred': {
                'name': 'string',
                'type': 'basic'
              },
              'needCast': false,
              'tokenRange': [35, 40],
              'type': 'template_string'
            }
          ],
          'inferred': {
            'name': 'void',
            'type': 'basic'
          },
          'isAsync': false,
          'isStatic': true,
          'hasThrow': false,
          'left': {
            'id': {
              'index': 33,
              'lexeme': 'print',
              'loc': loc(8, 11, 8, 16),
              'tag': 2
            },
            'type': 'method_call'
          },
          'loc': loc(8, 11, 8, 48),
          'tokenRange': [33, 41],
          'type': 'call'
        }
      ],
      'tokenRange': [32, 42],
      'type': 'stmts'
    });
    expect(tryStmt.finallyBlock).to.eql({
      'stmts': [
        {
          'args': [
            {
              'inferred': {
                'name': 'string',
                'type': 'basic'
              },
              loc: loc(10, 18, 10, 31),
              'needCast': false,
              'tokenRange': [47, 48],
              'type': 'string',
              'value': {
                'index': 47,
                loc: loc(10, 18, 10, 31),
                'string': 'finally block',
                'tag': 1
              }
            }
          ],
          'loc': {
            'end': {
              'column': 33,
              'line': 10
            },
            'start': {
              'column': 11,
              'line': 10
            }
          },
          'left': {
            'id': {
              'index': 45,
              'lexeme': 'print',
              'loc': {
                'end': {
                  'column': 16,
                  'line': 10
                },
                'start': {
                  'column': 11,
                  'line': 10
                }
              },
              'tag': 2
            },
            'type': 'method_call'
          },
          'isStatic': true,
          'isAsync': false,
          'hasThrow': false,
          'tokenRange': [45, 49],
          'type': 'call',
          'inferred': {
            'name': 'void',
            'type': 'basic'
          }
        }
      ],
      'tokenRange': [44, 50],
      'type': 'stmts'
    });
  });

  it('set string to readable should ok', function () {
    expect(function () {
      parse(`
        model M = {
          body: readable
        }

        static function func(m: M): void {
          m.body = 'string';
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        model M = {
          body: readable
        }

        static function func(m: M, b: bytes): void {
          m.body = b;
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      model M = {
        body: readable
      }

      static function func(m: M): void {
        m.body = 1234;}`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`can't assign number to readable`);
    });
  });

  it('inferred for assign should ok', function () {
    const ast = parse(`
      init();

      api get(): void {
        __request.method = 'GET';
        __request.pathname = '/';
        __request.headers.key = \`abc\`;
        if (true) {
          __request.headers.authorization = \`acs \`;
        }
      }`, '__filename');
    const [, api] = ast.moduleBody.nodes;
    const [, , headersStmt, ifstmt] = api.apiBody.stmts.stmts;
    expect(headersStmt).to.eql({
      'expr': {
        'elements': [
          {
            'type': 'element',
            'value': {
              'index': 30,
              'loc': loc(7, 34, 7, 37),
              'string': 'abc',
              'tag': 12,
              'tail': true
            }
          }
        ],
        'inferred': {
          'name': 'string',
          'type': 'basic'
        },
        'tokenRange': [30, 31],
        'type': 'template_string'
      },
      'left': {
        'id': {
          'inferred': {
            'moduleName': undefined,
            'name': '$Request',
            'type': 'model'
          },
          'index': 24,
          'lexeme': '__request',
          'loc': loc(7, 9, 7, 18),
          'tag': 2,
          'type': 'variable'
        },
        'inferred': {
          'name': 'string',
          'type': 'basic'
        },
        'propertyPath': [
          {
            'index': 26,
            'lexeme': 'headers',
            loc: loc(7, 19, 7, 26),
            'tag': 2
          },
          {
            'index': 28,
            'lexeme': 'key',
            'loc': {
              'end': {
                'column': 30,
                'line': 7
              },
              'start': {
                'column': 27,
                'line': 7
              }
            },
            'tag': 2
          }
        ],
        'propertyPathTypes': [
          {
            'keyType': {
              'name': 'string',
              'type': 'basic'
            },
            'type': 'map',
            'valueType': {
              'name': 'string',
              'type': 'basic'
            }
          },
          {
            'name': 'string',
            'type': 'basic'
          }
        ],
        'type': 'property'
      },
      'tokenRange': [24, 31],
      'type': 'assign'
    });
    expect(ifstmt.type).to.be('if');
    expect(ifstmt.stmts.stmts).to.eql([
      {
        'expr': {
          'elements': [
            {
              'type': 'element',
              'value': {
                'index': 43,
                'loc': loc(9, 46, 9, 50),
                'string': 'acs ',
                'tag': 12,
                'tail': true
              }
            }
          ],
          'inferred': {
            'name': 'string',
            'type': 'basic'
          },
          'tokenRange': [43, 44],
          'type': 'template_string'
        },
        'left': {
          'id': {
            'loc': loc(9, 11, 9, 20),
            'tag': 2,
            'type': 'variable',
            'index': 37,
            'inferred': {
              'moduleName': undefined,
              'name': '$Request',
              'type': 'model'
            },
            'lexeme': '__request'
          },
          'inferred': {
            'name': 'string',
            'type': 'basic'
          },
          'propertyPath': [
            {
              'index': 39,
              'lexeme': 'headers',
              'loc': loc(9, 21, 9, 28),
              'tag': 2
            },
            {
              'index': 41,
              'lexeme': 'authorization',
              'loc': loc(9, 29, 9, 42),
              'tag': 2
            }
          ],
          'propertyPathTypes': [
            {
              'keyType': {
                'name': 'string',
                'type': 'basic'
              },
              'type': 'map',
              'valueType': {
                'name': 'string',
                'type': 'basic'
              }
            },
            {
              'name': 'string',
              'type': 'basic'
            }
          ],
          'type': 'property',
        },
        'tokenRange': [37, 44],
        'type': 'assign',
      }
    ]);
  });

  it('should check and/or expr', function () {
    expect(function () {
      parse(`
        static function less(a: number, b: number): boolean;
        static function great(a: number, b: number): boolean;
        static function between(input: number, min: number, max: number): string {
          if (great(input, min) && less(input, max)) {
            return "yes";
          }
          return "no";
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        static function is(a: number, b: number): boolean;
        static function oneOf(input: number, min: number, max: number): string {
          if (is(input, max) || is(input, min)) {
            return "yes";
          }
          return "no";
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        static function oneOf(input: number, min: number, max: number): string {
          if ("string1" || "string2") {
            return "yes";
          }
          return "no";
        }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('the left expr must be boolean type');
    });

    expect(function () {
      parse(`
        static function oneOf(input: number, min: number, max: number): string {
          if (true || "string2") {
            return "yes";
          }
          return "no";
        }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('the right expr must be boolean type');
    });
  });

  it('if request assign: if/elseif/else should ok', function () {
    expect(function () {
      parse(`
        init();

        api get(): void {
          __request.method = 'GET';
          __request.pathname = '/';
          if (true) {
            __request.headers.authorization = \`acs \`;
          } else if (false) {
            __request.headers.authorization = \`acs \`;
          } else {
            __request.headers.authorization = \`acs \`;
          }
        }`, '__filename');
    }).to.not.throwException();
  });

  it('request assign: if/elseif/else should ok', function () {
    expect(function () {
      parse(`        static function main(): void {
          var a = '';
          if (true) {
            a = 'if';
          } else if (false) {
            a = 'else if';
          } else {
            a = 'else';
          }
        }`, '__filename');
    }).to.not.throwException();
  });

  it('if request assign with undefined property should not ok', function () {
    expect(function () {
      parse(`
        init();
        api get(): void {
          __request.method = 'GET';
          __request.pathname = '/';
          if (true) {
            __request.hehe = '/';
          }
        }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be(`The property hehe is undefined in model __request($Request)`);
    });

    expect(function () {
      parse(`
      init();
      api get(): void {
        __request.method = 'GET';
        __request.pathname = '/';
        __request.port = '7001';
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be(`can't assign string to number`);
    });
  });

  it('submodel as parameter should ok', function () {
    expect(function () {
      parse(`
      
        model M = {
          N: {

          }
        }
        static function test(i: class): void {}
        static function func(): void  {
          test(M.N);
        }`, '__filename');
    }).to.not.throwException((ex) => {
    });
  });

  it('undefined submodel as parameter should not ok', function () {
    expect(function () {
      parse(`
      
        model M = {
          N: {

          }
        }
        static function test(input: class): void {

        }

        function func(): void  {
          test(M.X);
        }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('The model M.X is undefined');
    });
  });

  it('while condition must be a boolean expr', function () {
    expect(function () {
      parse(`
      
        static function main(): void  {
          while (123) {

          }
        }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('the condition expr must be boolean type');
    });
  });

  it('condition is boolean should ok', function () {
    expect(function () {
      parse(`
      
        static function main(): void  {
          while (true) {

          }
        }
`, '__filename');
    }).to.not.throwException();
  });

  it('the list is not array type should not ok', function () {
    expect(function () {
      parse(`
      static function main(): void  {
        for (var i : {}) {

        }
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('the list in for must be array type');
    });
  });

  it('the list is array type should be ok', function () {
    expect(function () {
      parse(`
      static function main(): void  {
        for (var i : []) {

        }
      }`, '__filename');
    }).to.not.throwException();
  });

  it('return expr should match with return type', function () {
    expect(function () {
      parse(`static function callOSS(): void {
        return;
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`static function callOSS(): map[string]string {
        var m = {
          key = 'value',
        };

        return {
          k = 'string',
          ...m
        };
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`static function callOSS(): map[string]string {
        var m = {
          key = 123,
        };

        return {
          k = 'string',
          ...m
        };
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('the return type is not expected, expect: map[string]string, actual: map[string]any');
    });

    expect(function () {
      parse(`
      static function callOSS(): [ string ] {
        return [ '' ];
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      static function callOSS(): [ string ] {
        return [];
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('the return type is not expected, expect: [string], actual: [any]');
    });

    expect(function () {
      parse(`
      static function callOSS(): class {
        return [];
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('the return type is not expected, expect: class, actual: [any]');
    });

    expect(function () {
      parse(`
        static function callOSS(): [ string ] {
          return ['', 123];
        }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('the return type is not expected, expect: [string], actual: [any]');
    });

    expect(function () {
      parse(`
        model M = {};
        static function callOSS(): $Model {
          return new M;
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        model M = {};
        static function callOSS(): M {
          var v: any = null;
          return v;
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        static function callOSS(): map[string]any {
          return {key = 'value'};
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        static function callOSS(): map[string]string {
          return {key = 1};
        }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('the return type is not expected, expect: map[string]string, actual: map[string]number');
    });

    expect(function () {
      parse(`
        static function callOSS(): integer {
          return 0;
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        static function callOSS(): number {
          return 0;
        }`, '__filename');
    }).to.not.throwException();
  });

  it('use function in api should ok', function () {
    expect(function () {
      parse(`init();
      function getPath(): string {
        return "/";
      }

      api hello(): void {
        __request.method = 'GET';
        __request.pathname = getPath();
      }`, '__filename');
    }).to.not.throwException();
  });

  it('not expr should ok', function () {
    expect(function () {
      parse(`static function callOSS(): boolean {
        return !true;
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`static function callOSS(): boolean {
        return !'string';
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('the expr after ! must be boolean type');
    });
  });

  it('object = map[string]string should ok', function () {
    expect(function () {
      parse(`
        static function call(): void {
          var params: object = {
            grant_type = 'string',
          };
        }`, '__filename');
    }).to.not.throwException();
  });

  it('replace __module.xxx on AST should ok', function () {
    const ast = parse(`
      const version = "2012";
      static function callOSS(): string {
        return __module.version;
      }`, '__filename');
    const [, func] = ast.moduleBody.nodes;
    expect(func).to.be.eql({
      'annotation': undefined,
      'functionBody': {
        'loc': {
          'end': {
            'column': 8,
            'line': 5
          },
          'start': {
            'column': 41,
            'line': 3
          }
        },
        'stmts': {
          'stmts': [
            {
              'expr': {
                'type': 'string',
                inferred: {
                  type: 'basic',
                  name: 'string'
                },
                'value': {
                  'index': 4,
                  'loc': loc(2, 24, 2, 28),
                  'string': '2012',
                  'tag': 1
                }
              },
              'loc': {
                'end': {
                  'column': 7,
                  'line': 5
                },
                'start': {
                  'column': 9,
                  'line': 4
                }
              },
              'needCast': false,
              'tokenRange': [14, 18],
              'type': 'return'
            }
          ],
          'tokenRange': [13, 19],
          'type': 'stmts'
        },
        'tokenRange': [13, 19],
        'type': 'functionBody',
      },
      'functionName': {
        'index': 8,
        'lexeme': 'callOSS',
        'loc': {
          'end': {
            'column': 30,
            'line': 3
          },
          'start': {
            'column': 23,
            'line': 3
          }
        },
        'tag': 2
      },
      'isAsync': false,
      'isStatic': true,
      'hasThrow': false,
      'params': {
        'params': [],
        'type': 'params'
      },
      'returnType': {
        'index': 12,
        'lexeme': 'string',
        'loc': {
          'end': {
            'column': 40,
            'line': 3
          },
          'start': {
            'column': 34,
            'line': 3
          }
        },
        'tag': 8
      },
      'tokenRange': [6, 19],
      'type': 'function'
    });
  });

  it('support init body', function () {
    var ast = parse(`
    type @id = string;

    init(){
      @id = 'string';
    }`, '__filename');

    const [typedef, init] = ast.moduleBody.nodes;
    expect(typedef).to.eql({
      'annotation': undefined,
      'type': 'type',
      'tokenRange': [1, 5],
      'value': {
        'index': 4,
        'lexeme': 'string',
        'loc': loc(2, 16, 2, 22),
        'tag': 8
      },
      'vid': {
        'index': 2,
        'lexeme': '@id',
        'loc': loc(2, 10, 2, 13),
        'tag': 3
      }
    });
    expect(init.type).to.equal('init');
    expect(init.initBody).to.eql({
      type: 'stmts',
      'tokenRange': [9, 14],
      stmts: [
        {
          'expr': {
            'loc': loc(5, 14, 5, 20),
            'tokenRange': [12, 13],
            'type': 'string',
            'value': {
              'index': 12,
              'loc': loc(5, 14, 5, 20),
              'tag': 1,
              'string': 'string'
            },
            'inferred': {
              'name': 'string',
              'type': 'basic'
            }
          },
          'left': {
            'inferred': {
              'name': 'string',
              'type': 'basic'
            },
            'type': 'virtualVariable',
            'vid': {
              'index': 10,
              'lexeme': '@id',
              'loc': loc(5, 7, 5, 10),
              'tag': 3
            }
          },
          'loc': loc(5, 7, 5, 21),
          'tokenRange': [10, 13],
          'type': 'assign'
        }
      ]
    });
  });

  it('init with parameter should ok', function () {
    expect(function () {
      parse(`
        type @id = string;

        init(id: string){
          @id = idx;
        }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('variable "idx" undefined');
    });

    expect(function () {
      parse(`
        type @id = string;

        init(id: string){
          @id = id;
        }`, '__filename');
    }).to.not.throwError();
  });

  it('retry only can be in returns block', function () {
    expect(function () {
      parse(`
        static function a(): void {
          retry;
        }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('retry only can be in returns block');
    });

    expect(function () {
      parse(`
        init() {}
        api hello(): void {
          retry;
        } returns {

        }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('retry only can be in returns block');
    });

    expect(function () {
      parse(`
        init() {}
        api hello(): void {
          
        } returns {
          retry;
        }`, '__filename');
    }).to.not.throwError();
  });

  it('throw should be ok', function () {
    expect(function () {
      parse(`
        init() {}
        api hello(): void {
          throw {};
        } returns {

        }`, '__filename');
    }).to.not.throwError();
  });

  describe('needToMap', function () {
    it('needToMap should ok', function () {
      const ast = parse(`
        static function callA(a: any): void;
        model M = {};
        static function main(): void {
          callA(new M);
        }`, '__filename');
      const [, , f2] = ast.moduleBody.nodes;
      expect(f2.functionBody.stmts.stmts).to.be.eql([
        {
          'args': [
            {
              'aliasId': {
                'index': 29,
                'isModel': true,
                'lexeme': 'M',
                'loc': loc(5, 21, 5, 22),
                'tag': 2
              },
              'inferred': {
                'moduleName': undefined,
                'name': 'M',
                'type': 'model'
              },
              'needCast': true,
              'object': null,
              'propertyPath': [],
              'tokenRange': [28, 30],
              'type': 'construct_model'
            }
          ],
          'inferred': {
            'name': 'void',
            'type': 'basic'
          },
          'isAsync': false,
          'isStatic': true,
          'hasThrow': false,
          'left': {
            'id': {
              'index': 26,
              'lexeme': 'callA',
              'loc': loc(5, 11, 5, 16),
              'tag': 2
            },
            'type': 'method_call'
          },
          'loc': loc(5, 11, 5, 23),
          'tokenRange': [26, 31],
          'type': 'call'
        }
      ]);
    });

    it('needToMap(with null) should ok', function () {
      const ast = parse(`
        model M = {};
        static function callA(a: M): void;
        static function main(): void {
          callA(null);
        }`, '__filename');
      const [, , f2] = ast.moduleBody.nodes;
      expect(f2.functionBody.stmts.stmts).to.be.eql([
        {
          'args': [
            {
              'inferred': {
                'name': 'null',
                'type': 'basic'
              },
              'needCast': false,
              'tokenRange': [28, 29],
              'type': 'null'
            }
          ],
          'inferred': {
            'name': 'void',
            'type': 'basic'
          },
          'isAsync': false,
          'isStatic': true,
          'hasThrow': false,
          'left': {
            'id': {
              'index': 26,
              'lexeme': 'callA',
              'loc': loc(5, 11, 5, 16),
              'tag': 2
            },
            'type': 'method_call'
          },
          'loc': loc(5, 11, 5, 22),
          'tokenRange': [26, 30],
          'type': 'call'
        }
      ]);
    });

    it('needToMap(with $Model) should ok', function () {
      const ast = parse(`
        model M = {};
        static function callA(a: $Model): void;
        static function main(): void {
          callA(new M);
        }`, '__filename');
      const [, , f2] = ast.moduleBody.nodes;
      expect(f2.functionBody.stmts.stmts).to.be.eql([
        {
          'args': [
            {
              'aliasId': {
                'index': 29,
                'isModel': true,
                'lexeme': 'M',
                'loc': loc(5, 21, 5, 22),
                'tag': 2
              },
              'inferred': {
                'moduleName': undefined,
                'name': 'M',
                'type': 'model'
              },
              'needCast': false,
              'object': null,
              'propertyPath': [],
              'tokenRange': [28, 30],
              'type': 'construct_model'
            }
          ],
          'inferred': {
            'name': 'void',
            'type': 'basic'
          },
          'hasThrow': false,
          'isAsync': false,
          'isStatic': true,
          'left': {
            'id': {
              'index': 26,
              'lexeme': 'callA',
              'loc': loc(5, 11, 5, 16),
              'tag': 2
            },
            'type': 'method_call'
          },
          'loc': loc(5, 11, 5, 23),
          'tokenRange': [26, 31],
          'type': 'call'
        }
      ]);
    });
  });

  it('inferred for object should ok', function () {
    function getObjectInferred(expr) {
      const ast = parse(`
        static function hello(): void {
          var a = ${expr};
        }`, '__filename');
      const [f1] = ast.moduleBody.nodes;
      const [s1] = f1.functionBody.stmts.stmts;
      return s1.expr.inferred;
    }

    expect(getObjectInferred('{}')).to.eql({
      'keyType': {
        'name': 'string',
        'type': 'basic'
      },
      'type': 'map',
      'valueType': {
        'name': 'any',
        'type': 'basic'
      }
    });

    expect(getObjectInferred(`{key = 'value'}`)).to.eql({
      'keyType': {
        'name': 'string',
        'type': 'basic'
      },
      'type': 'map',
      'valueType': {
        'name': 'string',
        'type': 'basic'
      }
    });

    expect(getObjectInferred(`{key = 'value', key2 = 1}`)).to.eql({
      'keyType': {
        'name': 'string',
        'type': 'basic'
      },
      'type': 'map',
      'valueType': {
        'name': 'any',
        'type': 'basic'
      }
    });
  });

  it('construct model should be ok', function () {
    expect(function () {
      parse(`
        model M {
          key: [ string ],
          fieldLong: long,
        };

        static function hello(): void {
          new M{
            key = [ 'string' ],
            fieldLong = 3600,
          };
        }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model N {}
        model M {
          n: [N]
        };

        static function hello(): void {
          new M{
            n = [ new N ]
          };
        }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model N {}
        model M {
          n: N
        };

        static function hello(): void {
          new M{
            n = new N
          };
        }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model M {
          n: {}
        };

        static function hello(): void {
          new M{
            n = new M.n
          };
        }`, '__filename');
    }).to.not.throwError();
  });

  it('construct model expectedType should be ok', function () {
    
    let ast = parse(`
      model M {
        key: [ string ],
        fieldLong: long,
      };

      static function hello(): void {
        new M{
          key = [ 'string' ],
          fieldLong = 3600,
        };
      }`, '__filename');
    let expectedType = ast.moduleBody.nodes[1].functionBody.stmts.stmts[0].object.fields[0].expectedType;
    expect(expectedType).to.be.eql({
      'type': 'array',
      'itemType': {
        'type': 'basic',
        'name': 'string'
      }
    });

    ast = parse(`
        model N {}
        model M {
          n: [N]
        };

        static function hello(): void {
          new M{
            n = [ new N ]
          };
        }`, '__filename');
    expectedType = ast.moduleBody.nodes[2].functionBody.stmts.stmts[0].object.fields[0].expectedType;
    expect(expectedType).to.be.eql({
      'type': 'array',
      'itemType': {
        'moduleName': undefined,
        'type': 'model',
        'name': 'N'
      }
    });

    ast = parse(`
        model N {}
        model M {
          n: N
        };

        static function hello(): void {
          new M{
            n = new N
          };
        }`, '__filename');
    expectedType = ast.moduleBody.nodes[2].functionBody.stmts.stmts[0].object.fields[0].expectedType;
    expect(expectedType).to.be.eql({
      'moduleName': undefined,
      'type': 'model',
      'name': 'N'
    });

    ast = parse(`
        model M {
          n: map[string] any
        };

        static function hello(): void {
          new M{
            n = {key = 'string'}
          };
        }`, '__filename');
    expectedType = ast.moduleBody.nodes[1].functionBody.stmts.stmts[0].object.fields[0].expectedType;
    expect(expectedType).to.be.eql({
      'type': 'map',
      'keyType': {
        'type': 'basic',
        'name': 'string'
      },
      'valueType': {
        'type': 'basic',
        'name': 'any'
      }
    });
    ast = parse(`
        model M {
          n: {}
        };

        static function hello(): void {
          new M{
            n = new M.n
          };
        }`, '__filename');
    expectedType = ast.moduleBody.nodes[1].functionBody.stmts.stmts[0].object.fields[0].expectedType;
    expect(expectedType).to.be.eql({
      'moduleName': undefined,
      'type': 'model',
      'name': 'M.n'
    });
  });

  it('vid should be ok', function () {
    expect(function () {
      parse(`
        model M {
          key: {
            key2: string
          }
        };

        type @id = M;
        init() {
          @id = new M{
            key = new M.key{
              key2 = 'string'
            }
          };
        }

        function main(): void {
          @id.key.key2 = 'key2';
        }
        `, '__filename');
    }).to.not.throwError();
  });

  it('vid with idType should be ok', function () {
    const ast = parse(`
      model M {
        key: {
          key2: string
        }
      };

      type @id = M;`, '__filename');
    const [, id] = ast.moduleBody.nodes;
    expect(id.value.idType).to.be('model');
  });

  it('assign model instance to a model filed should ok', function () {
    expect(function () {
      parse(`
        model M {
          key: {
            key2: string
          }
        };

        model N {
          key: M.key
        }

        static function main(): void {
          var mKey = new M.key{
            key2 = 'key2'
          };
          var n = new N{
            key = mKey
          };
        }
        `, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model M {
          key: {
            key2: string
          }
        };

        model N {
          key: M
        }

        static function main(): void {
          var m = new M{
            key = new M.key{
              key2 = 'key2'
            }
          };
          var n = new N{
            key = m
          };
        }
        `, '__filename');
    }).to.not.throwError();

    expect(function () {
      readAndParse('fixtures/module_assign/main.dara');
    }).to.not.throwError();
  });

  it('super should be ok', function () {
    expect(function () {
      parse(`
        static function hello(): void {
          super();
        }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('super only allowed in init method');
    });

    expect(function () {
      parse(`
        init() {
          super();
        }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('this module have no parent module');
    });
  });

  it('map[] should be ok', function () {
    expect(function () {
      parse(`
        static function hello(): void {
          var a = {};
          var key = 1;
          a[key];
          a[key] = 'string';
        }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('The key expr type must be string type');
    });

    expect(function () {
      parse(`
        static function hello(): void {
          var a = {};
          var key = 'str';
          a[key];
        }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        static function hello(): void {
          var a = {
            b = {}
          };
          var key = 'str';
          a.b[key];
        }`, '__filename');

      parse(`
        model M = { N: map[string]any }
        static function hello(): void {
          var a = new M;
          var key = 'str';
          a.N[key];
        }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        static function hello(): void {
          var a = [1, 2, 3];
          var key = 'str';
          a[key];
        }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('The key expr type must be number type');
    });

    expect(function () {
      parse(`
        static function hello(): void {
          var a = [1, 2, 3];
          var key = 1;
          a[key];
        }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        static function hello(): void {
          var a = 'hehe';
          var key = 'str';
          a[key];
        }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the [] form only support map or array type');
    });
  });

  it('caculate property path types should be ok', function () {
    const ast = parse(`
      model M {
        N: {
          A: string
        }
      }
      static function hello(m: M): void {
        m.N.A;
      }`, '__filename');
    const [, func1] = ast.moduleBody.nodes;
    const [stmt] = func1.functionBody.stmts.stmts;
    expect(stmt.propertyPathTypes).to.eql([
      {
        'moduleName': undefined,
        'name': 'M.N',
        'type': 'model'
      },
      {
        'name': 'string',
        'type': 'basic'
      }
    ]);

    const ast2 = parse(`
    model N1 {
      A: string
    }

    model M1 {
      N: N1
    }

    static function hello(m: M1): void {
      m.N.A;
    }`, '__filename');
    const [, , func2] = ast2.moduleBody.nodes;
    const [stmt1] = func2.functionBody.stmts.stmts;
    expect(stmt1.propertyPathTypes).to.eql([
      {
        'moduleName': undefined,
        'name': 'N1',
        'type': 'model'
      },
      {
        'name': 'string',
        'type': 'basic'
      }
    ]);
  });

  it('return expr in init function is limited', function () {
    expect(function () {
      parse(`
      init() {
        return 'string';
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('should not have return value in init method');
    });
  });

  it('var arr: [ string ] = [] should ok', function () {
    expect(function () {
      parse(`
      init() {
        var empty: [string] = [];
      }`, '__filename');
    }).to.not.throwError();
  });

  it('used types should ok', function () {
    const ast = parse(`
      type @r = readable;
    `, '__filename');
    expect(ast.usedTypes.has('readable')).to.be(true);
    expect(ast.usedTypes.has('writable')).to.be(false);
  });

  it('used types(in model) should ok', function () {
    const ast = parse(`
      model m {
        r: readable
      }
    `, '__filename');
    expect(ast.usedTypes.has('readable')).to.be(true);
  });
});
