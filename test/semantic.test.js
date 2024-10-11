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

    expect(() => {
      parse(`
        model defined {};
        model defined2 extends defined {};
        model defined3 extends modelname {};`, '__filename');
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
    }).to.not.throwException();
  });

  it('extends model before define it should ok', function () {
    expect(() => {
      parse(`model defined extends undefined {
          key: string
        };

        model undefined = {};
      `, '__filename');
    }).to.not.throwException();
  });

  it('extends model after define it should not ok', function () {
    expect(() => {
      parse(`
      model defined = {};

      model modelname extends defined {
          key: string
        };
      `, '__filename');
    }).to.not.throwException();
  });

  it('use extends model field should not ok', function () {
    expect(() => {
      parse(`
      model defined = {
        value: number,
      };

      model modelname extends defined {
        key: string
      };
      
      init() {
        var m = new modelname {
          key = 'key',
          value = 100
        };
      }
      `, '__filename');
    }).to.not.throwException();
  });

  it('overwrite extends model field should not ok', function () {
    expect(() => {
      parse(`
      model defined = {
        value: number,
      };

      model modelname extends defined {
        key: string,
        value: string
      };
      
      init() {
        var m = new modelname {
          key = 'key',
          value = 'value'
        };
      }
      `, '__filename');
    }).to.not.throwException();
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
      expect(e.message).to.be(`redefined model or exception "id"`);
    });
  });

  it('redefine exception should not ok', function () {
    expect(() => {
      parse(`
        exception id = { key: string }
        exception id = { key: string }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`redefined model or exception "id"`);
    });

    expect(() => {
      parse(`
        model id = { key: string }
        exception id = { key: string }`, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`redefined model or exception "id"`);
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
        `but xcall(string, integer, boolean)`);
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
          return query;
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
      'extendOn': undefined,
      'isException': false,
      'modelBody': {
        'extendFileds': [],
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
              'extendFileds': [],
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
      'extendOn': undefined,
      'isException': false,
      'modelBody': {
        'extendFileds': [],
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

  it('submodel extend fields should ok', function () {
    var ast = parse(`
      model a = {
        name: string
      }
        
      model b extends a {
        age: number
      }

      model c extends b {
        age: string,
        nickname: string
      }
      `, '__filename');
    expect(ast.parserVersion).to.be.ok();
    const modelB = ast.models.b;
    expect(modelB.modelBody.extendFileds).to.eql([
      {
        'attrs': [],
        'fieldName': {
          'index': 5,
          'lexeme': 'name',
          'loc': loc(3, 9, 3, 13),
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
    ]);

    const modelC= ast.models.c;
    expect(modelC.modelBody.extendFileds).to.eql([
      {
        'attrs': [],
        'fieldName': {
          'index': 5,
          'lexeme': 'name',
          'loc': loc(3, 9, 3, 13),
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
    ]);
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
      'extendOn': undefined,
      'isException': false,
      modelBody: {
        type: 'modelBody',
        'tokenRange': [8, 21],
        'extendFileds': [],
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
      'extendOn': undefined,
      'isException': false,
      'modelBody': {
        'extendFileds': [],
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
      'extendOn': undefined,
      'isException': false,
      'modelBody': {
        'extendFileds': [],
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
          return new GroupDetailResponse.abilities{};
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
      'extendOn': undefined,
      'isException': false,
      'modelBody': {
        'extendFileds': [],
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

    expect(function () {
      parse(`
        static function callOSS(): void {
          var mapVal: map[string] string = null;
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        static function callOSS(): void {
          var entryVal: entry[string] = null;
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        static function callOSS(): void {
          var arrVal: [ string ] = null;
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        static function callOSS(): void {
          var arrVal = [
            'string'
          ];
          arrVal = null;
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        static function callOSS(): void {
          var mapVal = {
            key = 'string'
          };
          mapVal = null;
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

  it('iterator should ok', function () {
    expect(function () {
      parse(`
        static function getIterator(it: iterator[string]): iterator[string] {
          return it;
        }

        static function useIterator(it: iterator[string]): void{
          getIterator(it);
        }
`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        function getIterator(it: iterator[string]): void {
          it.a = 1;
        }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`The type of 'it' must be model, object or map`);
    });

    expect(function () {
      parse(`
        function getIterator(it: asyncIterator[string]): void {
          it.a = 1;
        }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`The type of 'it' must be model, object or map`);
    });
  });

  it('yield should ok', function () {
    expect(function () {
      parse(`
  async function test2(): iterator[number]{
    yield 32;
  }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`async function return type must be asyncIterator`);
    });

    expect(function () {
      parse(`
      init();

      api get(): asyncIterator[number] {
        __request.method = 'GET';
        __request.pathname = '/';
        __request.headers.key = \`abc\`;
        if (true) {
          __request.headers.authorization = \`acs \`;
        }
      } returns {
        yield __response.statusCode;
      }
`, '__filename');
    }).to.ok();

    expect(function () {
      parse(`
  async function test1(): asyncIterator[string];
  async function test2(): asyncIterator[string]{
    var it:iterator[string] = test1();
    for(var test : it) {
        yield test;
    }
  }
  async function test3(): asyncIterator[string]{
    yield 'test';
  }
`, '__filename');
    }).to.ok();

    expect(function () {
      parse(`
  async function test2(): asyncIterator[string]{
    yield 32;
  }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the return type is not expected, expect: string, actual: integer`);
    });

    expect(function () {
      parse(`
  async function test2(): iterator[number]{
    yield 32;
  }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`async function return type must be asyncIterator`);
    });

    expect(function () {
      parse(`
      init();

      api get(): iterator[number] {
        __request.method = 'GET';
        __request.pathname = '/';
        __request.headers.key = \`abc\`;
        if (true) {
          __request.headers.authorization = \`acs \`;
        }
      } returns {
        yield __response.statusCode;
      }
`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`api return type must be asyncIterator`);
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
                    'expectedType': {
                      'extendOn': undefined,
                      'moduleName': undefined,
                      'name': 'M',
                      'type': 'model'
                    },
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
              'expectedType': {
                'name': 'string',
                'type': 'basic'
              },
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
                        'extendOn': undefined,
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
              'expectedType': {
                'name': 'string',
                'type': 'basic'
              },
              'inferred': {
                'name': 'string',
                'type': 'basic'
              },
              'needCast': false,
              'loc': loc(8, 18, 8, 46),
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
              'expectedType': {
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
      expect(e.message).to.be(`can't assign integer to readable`);
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
        'loc': loc(7, 34, 7, 37),
        'tokenRange': [30, 31],
        'type': 'template_string'
      },
      'left': {
        'id': {
          'inferred': {
            'extendOn': undefined,
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
          'loc': loc(9, 46, 9, 50),
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
              'extendOn': undefined,
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
      parse(`static function callOSS(): entry[string] {
        var m = {
          key = 'value',
        };

        var entries: [ entry[string] ] = m.entries();

        return entries[0];
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`static function callOSS(): string {
        var m = ['a', 'b', 'c'];

        var arr: [ string ] = m.sort('acs');

        return arr[0];
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
        model M = {};
        static function callOSS(): map[string]any {
          var m = new M{};
          return {key = m};
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        model M = {};
        model M2 = {
          en: entry[M]
        };
        static function callOSS(): entry[any] {
          var m = {key = new M};
          var entries = m.entries();
          var m2 = { 
            key = new M2{ en = entries[0] } 
          };
          var entries2 = m2.entries();
          return entries2[0];
        }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
        static function callOSS(): map[string]string {
          return {key = 1};
        }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('the return type is not expected, expect: map[string]string, actual: map[string]integer');
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

  it('compare expr should ok', function () {
    expect(function () {
      parse(`static function callOSS(): boolean {
        return (true == false) || ("string" == "string") || (3 < 3) || ((3 <= 2) && (2 >= 3));
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`static function callOSS(): string {
        if(3 > 2) {
          return 'true';
        }
        return 'false';
      }`, '__filename');
    }).to.not.throwException();
    
    expect(function () {
      parse(`static function callOSS(): string {
        var a = 'string';
        var b = 'string';
        if(a == b) {
          return 'true';
        }
        return 'false';
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`static function callOSS(): boolean {
        return 3.0 == 3;
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('float can only compare with float type, but integer');
    });

    expect(function () {
      parse(`static function callOSS(): boolean {
        return 3 == 3L;
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('integer can only compare with integer type, but long');
    });

    expect(function () {
      parse(`static function callOSS(): boolean {
        var a: int8 = 3;
        return a == 3;
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`static function callOSS(): boolean {
        var a: int8 = 3;
        var b: uint8 = 3;
        return a == b;
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('int8 can only compare with int8 type, but uint8');
    });

    expect(function () {
      parse(`static function callOSS(): boolean {
        return 'string' == 3;
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('string can only compare with string type, but integer');
    });

    expect(function () {
      parse(`static function callOSS(): boolean {
        return 'string' > 3;
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('gt can only operate number type, but left: string and right: integer');
    });

    expect(function () {
      parse(`static function callOSS(): boolean {
        return false <= 3;
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('lte can only operate number type, but left: boolean and right: integer');
    });

    expect(function () {
      parse(`static function callOSS(): boolean {
        return 'string' > 'number';
      }`, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.a(SyntaxError);
      expect(ex.message).to.be('gt can only operate number type, but left: string and right: string');
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

    expect(function () {
      parse(`
        exception Error {};
        init() {}
        api hello(): void {
          throw new Error{};
        } returns {

        }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        exception Error {
          status: number,
          message: string,
          code: string,
          data: map[string]string,
          en: entry[string]
        };
        init() {}
        api hello(): void {
          var m = { key = 'test'};
          var entries = m.entries();
          throw new Error{
            status = 200,
            message = 'error message',
            code = 'Error',
            data = {
              test = 'test',
            },
            en = entries[0]
          };
        } returns {

        }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model Base {
          name: string,
        };
        exception Error extends Base {
          message: string,
          code: string,
        };
        init() {}
        api hello(): void {
          throw new Error{
            name = 'errorName',
            message = 'error message',
            code = 'extendError'
          };
        } returns {

        }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        exception Error extends $Error {};
        init() {}
        api hello(): void {
          throw new Error{
            name = 'extendError',
            message = 'error message',
            code = 'extendError'
          };
        } returns {

        }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        exception Error {
          status: number,
        };
        init() {}
        api hello(): void {
          throw new Error{
            statusCode = 200,
          };
        } returns {

        }`, '__filename');
    }).to.throwError(function(e) {
      console.log(e);
      expect(e).to.be.an(SyntaxError);
      expect(e.message).to.be('the property "statusCode" is undefined in model "Error"');
    });
  });

  describe('needToMap', function () {
    it('needToMap should ok', function () {
      let ast = parse(`
        static function callA(a: any): void;
        model M = {};
        static function main(): void {
          callA(new M);
        }`, '__filename');
      let [, , f2] = ast.moduleBody.nodes;
      expect(f2.functionBody.stmts.stmts).to.be.eql([
        {
          'args': [
            {
              'aliasId': {
                'index': 29,
                'isModel': true,
                'isException': false,
                'lexeme': 'M',
                'loc': loc(5, 21, 5, 22),
                'tag': 2
              },
              'expectedType': {
                'name': 'any',
                'type': 'basic'
              },
              'inferred': {
                'extendOn': undefined,
                'moduleName': undefined,
                'isException': false,
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
      ast = parse(`
      static function callA(a: object): void;
      model M = {};
      static function main(): void {
        callA(new M);
      }`, '__filename');
      [, , f2] = ast.moduleBody.nodes;
      expect(f2.functionBody.stmts.stmts).to.be.eql([
        {
          'args': [
            {
              'aliasId': {
                'index': 29,
                'isModel': true,
                'isException': false,
                'lexeme': 'M',
                'loc': loc(5, 19, 5, 20),
                'tag': 2
              },
              'expectedType': {
                'keyType': {
                  'name': 'string',
                  'type': 'basic'
                },
                'type': 'map',
                'valueType': {
                  'name': 'any',
                  'type': 'basic'
                }
              },
              'inferred': {
                'extendOn': undefined,
                'moduleName': undefined,
                'isException': false,
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
              'loc': loc(5, 9, 5, 14),
              'tag': 2
            },
            'type': 'method_call'
          },
          'loc': loc(5, 9, 5, 21),
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
              'expectedType': {
                'extendOn': undefined,
                'moduleName': undefined,
                'name': 'M',
                'type': 'model'
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
                'isException': false,
                'isModel': true,
                'lexeme': 'M',
                'loc': loc(5, 21, 5, 22),
                'tag': 2
              },
              'inferred': {
                'extendOn': undefined,
                'moduleName': undefined,
                'isException': false,
                'name': 'M',
                'type': 'model'
              },
              'expectedType': {
                'extendOn': undefined,
                'moduleName': undefined,
                'name': '$Model',
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
        'extendOn': undefined,
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
      'extendOn': undefined,
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
      'extendOn': undefined,
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
      parse(`
        model M {
          key: {
            key2: [{
              key3: string
            }]
          }
        };

        static function main(): void {
          var key3 = new M.key.key2{
            key3 = 'key3'
          }; 
          var key = new M.key{
            key2 = [key3]
          };
          var m = new M{
            key = key
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
        'extendOn': undefined,
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
        'extendOn': undefined,
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

  it('number type check in assign expr should ok', function () {
    expect(function () {
      parse(`
      init() {
        var num: number = 123;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var num: number = 1.23;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var num: number = 1.23d;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var num: number = 123L;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var num: [ number ] = [ 123 ];
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var num: [ number ] = [ 1.23 ];
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var num: [ number ] = [ 1.23d ];
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var num: [ number ] = [ 123L ];
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var num: map[ string ] number = {
          val = 123
        };
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var num: map[ string ] number = {
          val = 1.23
        };
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var num: map[ string ] number = {
          val = 1.23d
        };
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var num: map[ string ] number = {
          val = 123L
        };
      }`, '__filename');
    }).to.not.throwError();


    expect(function () {
      parse(`
      init() {
        var intNum: integer = 123;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var intArr: [ integer ] = [ 123 ];
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var intMap: map[string] integer = {
          val = 123
        };
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var int8Num: int8 = 123;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var int8Arr: [ int8 ] = [ 123 ];
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var int8Map: map[string] int8 = {
          val = 123
        };
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var uint8Num: uint8 = 123;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var int16Num: int16 = 123;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var uint16Num: uint16 = 123;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var int32Num: int32 = 123;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var uint32Num: uint32 = 123;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var int64Num: int64 = 123;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var uint64Num: uint64 = 123;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var longNum: long = 123L;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var longArr: [ long ] = [ 123L ];
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var longMap: map[string] long = {
          val = 123L
        };
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var ulongNum: ulong = 123L;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var longNum: long = 123;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var ulongNum: ulong = 123;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var floatNum: float = 1.23;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var floatArr: [ float ] = [ 1.23 ];
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var floatMap: map[string] float = {
          val = 1.23
        };
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var doubleNum: double = 1.23d;
      }`, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
      init() {
        var intNum: integer = 1.23;
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('declared variable with mismatched type, expected: integer, actual: float');
    });

    expect(function () {
      parse(`
      init() {
        var intNum: integer = 1.23d;
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('declared variable with mismatched type, expected: integer, actual: double');
    });

    expect(function () {
      parse(`
      init() {
        var intNum: integer = 123L;
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('declared variable with mismatched type, expected: integer, actual: long');
    });

    expect(function () {
      parse(`
      init() {
        var floatNum: float = 123;
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('declared variable with mismatched type, expected: float, actual: integer');
    });

    expect(function () {
      parse(`
      init() {
        var floatNum: float = 1.23d;
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('declared variable with mismatched type, expected: float, actual: double');
    });

    expect(function () {
      parse(`
      init() {
        var floatNum: float = 123L;
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('declared variable with mismatched type, expected: float, actual: long');
    });

    expect(function () {
      parse(`
      init() {
        var doubleNum: double = 1.23;
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('declared variable with mismatched type, expected: double, actual: float');
    });

    expect(function () {
      parse(`
      init() {
        var doubleNum: double = 123;
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('declared variable with mismatched type, expected: double, actual: integer');
    });

    expect(function () {
      parse(`
      init() {
        var doubleNum: double = 123L;
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('declared variable with mismatched type, expected: double, actual: long');
    });

    expect(function () {
      parse(`
      init() {
        var longNum: long = 1.23;
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('declared variable with mismatched type, expected: long, actual: float');
    });

    expect(function () {
      parse(`
      init() {
        var longNum: long = 1.23d;
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('declared variable with mismatched type, expected: long, actual: double');
    });
  });

  it('number type check in modle construct should ok', function () {
    expect(function () {
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
      }

      init() {
        var m = new M{
          intNum = 123,
          int8Num = 123,
          uint8Num = 123,
          int16Num = 123,
          uint16Num = 123,
          int32Num = 123,
          uint32Num = 123,
          int64Num = 123,
          uint64Num = 123,
          longNum = 123L,
          ulongNum = 123L,
          floatNum = 1.23,
          doubleNum = 1.23d,
          intArr = [ 123 ],
          int8Arr = [ 123 ],
          longArr = [ 123L ],
          floatArr = [ 1.23 ],
          intMap = {
            val = 123
          },
          int8Map = {
            val = 123
          },
          longMap = {
            val = 123L
          },
          floatMap = {
            val = 1.23
          },
        };
      }`, '__filename');
    }).to.not.throwError();


    expect(function () {
      parse(`
      model M {
        intNum: integer
      }
      init() {
        var m = new M{
          intNum = 1.23
        };
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the field type are mismatched. expected integer, but float');
    });

    expect(function () {
      parse(`
      model M {
        intNum: integer
      }
      init() {
        var m = new M{
          intNum = 1.23d
        };
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the field type are mismatched. expected integer, but double');
    });

    expect(function () {
      parse(`
      model M {
        intNum: integer
      }
      init() {
        var m = new M{
          intNum = 123L
        };
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the field type are mismatched. expected integer, but long');
    });

    expect(function () {
      parse(`
      model M {
        longNum: long
      }
      init() {
        var m = new M{
          longNum = 1.23
        };
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the field type are mismatched. expected long, but float');
    });

    expect(function () {
      parse(`
      model M {
        longNum: long
      }
      init() {
        var m = new M{
          longNum = 1.23d
        };
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the field type are mismatched. expected long, but double');
    });

    expect(function () {
      parse(`
      model M {
        floatNum: float
      }
      init() {
        var m = new M{
          floatNum = 123L
        };
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the field type are mismatched. expected float, but long');
    });

    expect(function () {
      parse(`
      model M {
        floatNum: float
      }
      init() {
        var m = new M{
          floatNum = 1.23d
        };
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the field type are mismatched. expected float, but double');
    });

    expect(function () {
      parse(`
      model M {
        floatNum: float
      }
      init() {
        var m = new M{
          floatNum = 123
        };
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the field type are mismatched. expected float, but integer');
    });

    expect(function () {
      parse(`
      model M {
        doubleNum: double
      }
      init() {
        var m = new M{
          doubleNum = 123L
        };
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the field type are mismatched. expected double, but long');
    });

    expect(function () {
      parse(`
      model M {
        doubleNum: double
      }
      init() {
        var m = new M{
          doubleNum = 1.23
        };
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the field type are mismatched. expected double, but float');
    });

    expect(function () {
      parse(`
      model M {
        doubleNum: double
      }
      init() {
        var m = new M{
          doubleNum = 123
        };
      }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the field type are mismatched. expected double, but integer');
    });
  });

  it('parameters number type check in method call should ok', function () {
    expect(() => {
      parse(`
        api get(intNum: number, floatNum: number, longNum: long): string {
          __request.method = 'GET';
          __request.pathname = '/';
        }

        async function getObject(): string {
          return get(123, 1.23, 123L);
        }

        init() {}`, '__filename');
    }).to.not.throwError();

    expect(() => {
      parse(`
        api get(num: integer): string {
          __request.method = 'GET';
          __request.pathname = '/';
        }

        async function getObject(): string {
          return get(123);
        }
        
        init() {}`, '__filename');
    }).to.not.throwError();

    expect(() => {
      parse(`
          api get(
            int8Num: int8,
            uint8Num: uint8,
            int16Num: int16,
            uint16Num: uint16,
            int32Num: int32,
            uint32Num: uint32,
            int64Num: int64,
            uint64Num: uint64
          ): string {
            __request.method = 'GET';
            __request.pathname = '/';
          }

          async function getObject(): string {
            get(
              8, 8,
              16, 16,
              32, 32,
              64, 64
            );
            return '';
          }
          
          init() {}`, '__filename');
    }).to.not.throwError();

    expect(() => {
      parse(`
          api get(longNum: long, ulongNum: ulong): string {
            __request.method = 'GET';
            __request.pathname = '/';
          }

          async function getObject(): string {
            return get(123L, 123L);
          }

          async function getOtherObject(): string {
            return get(123, 123);
          }

          init() {}`, '__filename');
    }).to.not.throwError();

    expect(() => {
      parse(`
          api get(floatNum: float, doubleNum: double): string {
            __request.method = 'GET';
            __request.pathname = '/';
          }

          async function getObject(): string {
            return get(1.23, 1.23d);
          }
          
          init() {}`, '__filename');
    }).to.not.throwError();

    expect(() => {
      parse(`
          api get(num: integer): string {
            __request.method = 'GET';
            __request.pathname = '/';
          }

          async function getObject(): string {
            return get(1.23);
          }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the parameter types are mismatched. expected get(integer), but get(float)');
    });

    expect(() => {
      parse(`
          api get(num: integer): string {
            __request.method = 'GET';
            __request.pathname = '/';
          }

          async function getObject(): string {
            return get(1.23d);
          }
          
          init() {}`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the parameter types are mismatched. expected get(integer), but get(double)');
    });

    expect(() => {
      parse(`
          api get(num: integer): string {
            __request.method = 'GET';
            __request.pathname = '/';
          }

          async function getObject(): string {
            return get(123L);
          }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the parameter types are mismatched. expected get(integer), but get(long)');
    });

    expect(() => {
      parse(`
          api get(num: float): string {
            __request.method = 'GET';
            __request.pathname = '/';
          }

          async function getObject(): string {
            return get(123);
          }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the parameter types are mismatched. expected get(float), but get(integer)');
    });

    expect(() => {
      parse(`
          api get(num: float): string {
            __request.method = 'GET';
            __request.pathname = '/';
          }

          async function getObject(): string {
            return get(1.23d);
          }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the parameter types are mismatched. expected get(float), but get(double)');
    });

    expect(() => {
      parse(`
          api get(num: float): string {
            __request.method = 'GET';
            __request.pathname = '/';
          }

          async function getObject(): string {
            return get(123L);
          }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the parameter types are mismatched. expected get(float), but get(long)');
    });

    expect(() => {
      parse(`
          api get(num: double): string {
            __request.method = 'GET';
            __request.pathname = '/';
          }

          async function getObject(): string {
            return get(123);
          }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the parameter types are mismatched. expected get(double), but get(integer)');
    });

    expect(() => {
      parse(`
          api get(num: double): string {
            __request.method = 'GET';
            __request.pathname = '/';
          }

          async function getObject(): string {
            return get(1.23);
          }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the parameter types are mismatched. expected get(double), but get(float)');
    });

    expect(() => {
      parse(`
          api get(num: double): string {
            __request.method = 'GET';
            __request.pathname = '/';
          }

          async function getObject(): string {
            return get(123L);
          }`, '__filename');
    }).to.throwError((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('the parameter types are mismatched. expected get(double), but get(long)');
    });
  });

  it('conflict models should ok', function () {
    let ast = readAndParse('fixtures/module_model_conflict/module_model_in_function.dara');
    expect(ast.conflictModels.has('OSS:Config')).to.be(true);
    ast = readAndParse('fixtures/module_model_conflict/module_model_in_model.dara');
    expect(ast.conflictModels.has('OSS:Config')).to.be(true);
    ast = readAndParse('fixtures/module_model_conflict/module_model_in_params.dara');
    expect(ast.conflictModels.has('OSS:Config')).to.be(true);
    ast = readAndParse('fixtures/module_model_conflict/module_model_conflict_other.dara');
    expect(ast.conflictModels.has('OSS:Config')).to.be(true);
    expect(ast.conflictModels.has('Source:Config')).to.be(true);
    expect(ast.conflictModels.has('Config')).to.be(true);
    ast = readAndParse('fixtures/module_model_conflict/module_model_unuse.dara');
    expect(ast.conflictModels.has('OSS:Config')).to.be(false);
  });

  it('used exceptions should ok', function () {
    let ast = readAndParse('fixtures/module_exception_used/main.dara');
    console.log(ast.usedExternException);
    expect(ast.usedExternException.get('OSS').has('Err1')).to.be(true);
    expect(ast.usedExternException.get('OSS').has('Config')).to.be(false);

    expect(ast.usedExternException.get('Source').has('Err1')).to.be(true);
    expect(ast.usedExternException.get('Source').has('Config')).to.be(false);
  });

  it('multi-dimentional array assign check should be ok', function () {
    expect(function () {
      parse(`
        static function main(): void {
          var mulArr: [[ string ]] = [ ['string'],['string'] ];
        }
        `, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        static function main(): void {
          var mulArr: [[[ string ]]] = [ [ ['string'] ],[ ['string'] ] ];
        }
        `, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model M {
          key: string
        }
        static function main(): void {
          var m = new M{ 
            key = 'string'
          };
          var mulArr: [[ M ]] = [ [ m ] ];
        }
        `, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model M {
          sub: {
            key: string
          }
        }
        static function main(): void {
          var sub = new M.sub{ 
            key = 'string'
          };
          var mulArr: [[ M.sub ]] = [ [ sub ] ];
        }
        `, '__filename');
    }).to.not.throwError();


    expect(function () {
      parse(`
        type @test = [[ string ]]
        init() {
          @test = [ ['string'],['string'] ];
        }
        `, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model M {
          key: [[ string ]]
        };

        static function main(): void {
          var m = new M{
            key = [[ 'string' ]]
          };
        }
        `, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model M {
          key: [[ number ]]
        };

        static function main(): void {
          var m = new M{
            key = [[ 2 ]]
          };
        }
        `, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model M {
          key: [[{
            key2: string
          }]]
        };

        static function main(): void {
          var key = new M.key{
            key2 = 'key2'
          };
          var m = new M{
            key = [[ key ]]
          };
        }
        `, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model M {
          key: [[[{
            key2: string
          }]]]
        };

        static function main(): void {
          var key = new M.key{
            key2 = 'key2'
          };
          var m = new M{
            key = [[[ key ]]]
          };
        }
        `, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model M {
          key: {
            key2: [[{
              key3: string
            }]]
          }
        };

        static function main(): void {
          var key3 = new M.key.key2{
            key3 = 'key3'
          }; 
          var key = new M.key{
            key2 = [[key3]]
          };
          var m = new M{
            key = key
          };
        }
        `, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model N {
          key: string
        }

        model M {
          n: [[ N ]]
        };

        static function main(): void {
          var n = new N{
            key = 'string'
          }; 
          var m = new M{
            n = [[ n ]]
          };
        }
        `, '__filename');
    }).to.not.throwError();

    expect(function () {
      parse(`
        model N {
          key: string
        }

        model M {
          n: [[[ N ]]]
        };

        static function main(): void {
          var n = new N{
            key = 'string'
          }; 
          var m = new M{
            n = [[[ n ]]]
          };
        }
        `, '__filename');
    }).to.not.throwError();
  });

  it('get value from array to assign should be ok', function () {
    let ast = parse(`
      static function main(): void {
        var configs = [1,2,3];
        var config = configs[0];
      }`, '__filename');
    let [, expr] = ast.moduleBody.nodes[0].functionBody.stmts.stmts;
    expect(expr.expr).to.eql({
      'type': 'array_access',
      'id': {
        'tag': 2,
        'loc': {
          'start': {
            'line': 4,
            'column': 22
          },
          'end': {
            'line': 4,
            'column': 29
          }
        },
        'lexeme': 'configs',
        'index': 23,
        'type': 'variable'
      },
      'accessKey': {
        'type': 'number',
        'value': {
          'tag': 9,
          'loc': {
            'start': {
              'line': 4,
              'column': 30
            },
            'end': {
              'line': 4,
              'column': 31
            }
          },
          'value': 0,
          'type': 'integer',
          'index': 25
        },
        'loc': {
          'start': {
            'line': 4,
            'column': 30
          },
          'end': {
            'line': 4,
            'column': 31
          }
        },
        'tokenRange': [
          25,
          26
        ],
        'inferred': {
          'type': 'basic',
          'name': 'integer'
        }
      },
      'loc': {
        'start': {
          'line': 4,
          'column': 22
        },
        'end': {
          'line': 4,
          'column': 32
        }
      },
      'tokenRange': [
        23,
        27
      ],
      'inferred': {
        'type': 'basic',
        'name': 'integer'
      }
    });

    ast = parse(`
      static function main(): void {
        var data = {
          configs = [1,2,3]
        };
        var config = data.configs[0];
      }`, '__filename');
    [, expr] = ast.moduleBody.nodes[0].functionBody.stmts.stmts;
    expect(expr.expr).to.eql({
      'type': 'array_access',
      'id': {
        'tag': 2,
        'loc': {
          'start': {
            'line': 6,
            'column': 22
          },
          'end': {
            'line': 6,
            'column': 26
          }
        },
        'lexeme': 'data',
        'index': 27,
        'type': 'variable',
        'inferred': {
          'type': 'map',
          'keyType': {
            'type': 'basic',
            'name': 'string'
          },
          'valueType': {
            'type': 'array',
            'itemType': {
              'type': 'basic',
              'name': 'integer'
            }
          }
        }
      },
      'propertyPath': [
        {
          'tag': 2,
          'loc': {
            'start': {
              'line': 6,
              'column': 27
            },
            'end': {
              'line': 6,
              'column': 34
            }
          },
          'lexeme': 'configs',
          'index': 29
        }
      ],
      'accessKey': {
        'type': 'number',
        'value': {
          'tag': 9,
          'loc': {
            'start': {
              'line': 6,
              'column': 35
            },
            'end': {
              'line': 6,
              'column': 36
            }
          },
          'value': 0,
          'type': 'integer',
          'index': 31
        },
        'loc': {
          'start': {
            'line': 6,
            'column': 35
          },
          'end': {
            'line': 6,
            'column': 36
          }
        },
        'tokenRange': [
          31,
          32
        ],
        'inferred': {
          'type': 'basic',
          'name': 'integer'
        }
      },
      'loc': {
        'start': {
          'line': 6,
          'column': 22
        },
        'end': {
          'line': 6,
          'column': 37
        }
      },
      'tokenRange': [
        27,
        33
      ],
      'propertyPathTypes': [
        {
          'type': 'array',
          'itemType': {
            'type': 'basic',
            'name': 'integer'
          }
        }
      ],
      'inferred': {
        'type': 'basic',
        'name': 'integer'
      }
    });

    ast = parse(`
      model M {
        configs: [ number ]
      }
      static function main(): void {
        var m = new M{
          configs = [1,2,3]
        };
        var config = m.configs[0];
      }`, '__filename');
    [, expr] = ast.moduleBody.nodes[1].functionBody.stmts.stmts;
    expect(expr.expr).to.eql({
      'type': 'array_access',
      'id': {
        'tag': 2,
        'loc': {
          'start': {
            'line': 9,
            'column': 22
          },
          'end': {
            'line': 9,
            'column': 23
          }
        },
        'lexeme': 'm',
        'index': 38,
        'type': 'variable',
        'inferred': {
          'extendOn': undefined,
          'isException': false,
          'type': 'model',
          'name': 'M',
          'moduleName': undefined
        }
      },
      'propertyPath': [
        {
          'tag': 2,
          'loc': {
            'start': {
              'line': 9,
              'column': 24
            },
            'end': {
              'line': 9,
              'column': 31
            }
          },
          'lexeme': 'configs',
          'index': 40
        }
      ],
      'accessKey': {
        'type': 'number',
        'value': {
          'tag': 9,
          'loc': {
            'start': {
              'line': 9,
              'column': 32
            },
            'end': {
              'line': 9,
              'column': 33
            }
          },
          'value': 0,
          'type': 'integer',
          'index': 42
        },
        'loc': {
          'start': {
            'line': 9,
            'column': 32
          },
          'end': {
            'line': 9,
            'column': 33
          }
        },
        'tokenRange': [
          42,
          43
        ],
        'inferred': {
          'type': 'basic',
          'name': 'integer'
        }
      },
      'loc': {
        'start': {
          'line': 9,
          'column': 22
        },
        'end': {
          'line': 9,
          'column': 34
        }
      },
      'tokenRange': [
        38,
        44
      ],
      'propertyPathTypes': [
        {
          'type': 'array',
          'itemType': {
            'type': 'basic',
            'name': 'number'
          }
        }
      ],
      'inferred': {
        'type': 'basic',
        'name': 'number'
      }
    });

    ast = parse(`
      static function f(config: number): void {
        var config2 = config;
      }

      static function main(): void {
        var data = {
          configs = [1,2,3]
        };
        var config = f(data.configs[0]);
      }`, '__filename');
    let [arg] = ast.moduleBody.nodes[1].functionBody.stmts.stmts[1].expr.args;
    expect(arg).to.eql({
      'type': 'array_access',
      'id': {
        'tag': 2,
        'loc': {
          'start': {
            'line': 10,
            'column': 24
          },
          'end': {
            'line': 10,
            'column': 28
          }
        },
        'lexeme': 'data',
        'index': 46,
        'type': 'variable',
        'inferred': {
          'type': 'map',
          'keyType': {
            'type': 'basic',
            'name': 'string'
          },
          'valueType': {
            'type': 'array',
            'itemType': {
              'type': 'basic',
              'name': 'integer'
            }
          }
        }
      },
      'propertyPath': [
        {
          'tag': 2,
          'loc': {
            'start': {
              'line': 10,
              'column': 29
            },
            'end': {
              'line': 10,
              'column': 36
            }
          },
          'lexeme': 'configs',
          'index': 48
        }
      ],
      'expectedType': {
        'name': 'number',
        'type': 'basic'
      },
      'accessKey': {
        'type': 'number',
        'value': {
          'tag': 9,
          'loc': {
            'start': {
              'line': 10,
              'column': 37
            },
            'end': {
              'line': 10,
              'column': 38
            }
          },
          'value': 0,
          'type': 'integer',
          'index': 50
        },
        'loc': {
          'start': {
            'line': 10,
            'column': 37
          },
          'end': {
            'line': 10,
            'column': 38
          }
        },
        'tokenRange': [
          50,
          51
        ],
        'inferred': {
          'type': 'basic',
          'name': 'integer'
        }
      },
      'loc': {
        'start': {
          'line': 10,
          'column': 24
        },
        'end': {
          'line': 10,
          'column': 39
        }
      },
      'tokenRange': [
        46,
        52
      ],
      'propertyPathTypes': [
        {
          'type': 'array',
          'itemType': {
            'type': 'basic',
            'name': 'integer'
          }
        }
      ],
      'inferred': {
        'type': 'basic',
        'name': 'integer'
      },
      'needCast': false
    });

    ast = parse(`
      model M {
        config: number
      }
      static function main(): void {
        var data = {
          configs = [1,2,3]
        };
        var m = new M{
          config = data.configs[0]
        };
      }`, '__filename');
    [expr] = ast.moduleBody.nodes[1].functionBody.stmts.stmts[1].expr.object.fields;
    expect(expr).to.eql({
      'type': 'objectField',
      'extendFrom': [],
      'fieldName': {
        'tag': 2,
        'loc': {
          'start': {
            'line': 10,
            'column': 11
          },
          'end': {
            'line': 10,
            'column': 17
          }
        },
        'lexeme': 'config',
        'index': 37
      },
      'expr': {
        'type': 'array_access',
        'id': {
          'tag': 2,
          'loc': {
            'start': {
              'line': 10,
              'column': 20
            },
            'end': {
              'line': 10,
              'column': 24
            }
          },
          'lexeme': 'data',
          'index': 39,
          'type': 'variable',
          'inferred': {
            'type': 'map',
            'keyType': {
              'type': 'basic',
              'name': 'string'
            },
            'valueType': {
              'type': 'array',
              'itemType': {
                'type': 'basic',
                'name': 'integer'
              }
            }
          }
        },
        'propertyPath': [
          {
            'tag': 2,
            'loc': {
              'start': {
                'line': 10,
                'column': 25
              },
              'end': {
                'line': 10,
                'column': 32
              }
            },
            'lexeme': 'configs',
            'index': 41
          }
        ],
        'accessKey': {
          'type': 'number',
          'value': {
            'tag': 9,
            'loc': {
              'start': {
                'line': 10,
                'column': 33
              },
              'end': {
                'line': 10,
                'column': 34
              }
            },
            'value': 0,
            'type': 'integer',
            'index': 43
          },
          'loc': {
            'start': {
              'line': 10,
              'column': 33
            },
            'end': {
              'line': 10,
              'column': 34
            }
          },
          'tokenRange': [
            43,
            44
          ],
          'inferred': {
            'type': 'basic',
            'name': 'integer'
          }
        },
        'loc': {
          'start': {
            'line': 10,
            'column': 20
          },
          'end': {
            'line': 11,
            'column': 9
          }
        },
        'tokenRange': [
          39,
          45
        ],
        'propertyPathTypes': [
          {
            'type': 'array',
            'itemType': {
              'type': 'basic',
              'name': 'integer'
            }
          }
        ],
        'inferred': {
          'type': 'basic',
          'name': 'integer'
        }
      },
      'tokenRange': [
        37,
        45
      ],
      'inferred': {
        'type': 'basic',
        'name': 'integer'
      },
      'expectedType': {
        'type': 'basic',
        'name': 'number'
      }
    });

    ast = parse(`
      type @configs = [ number ];
      init(configs: [ number ]) {
        @configs = configs;
        var config = @configs[0];
      }`, '__filename');
    [, expr] = ast.moduleBody.nodes[1].initBody.stmts;
    expect(expr.expr).to.eql({
      'type': 'array_access',
      'id': {
        'tag': 3,
        'loc': {
          'start': {
            'line': 5,
            'column': 22
          },
          'end': {
            'line': 5,
            'column': 30
          }
        },
        'lexeme': '@configs',
        'index': 24
      },
      'accessKey': {
        'type': 'number',
        'value': {
          'tag': 9,
          'loc': {
            'start': {
              'line': 5,
              'column': 31
            },
            'end': {
              'line': 5,
              'column': 32
            }
          },
          'value': 0,
          'type': 'integer',
          'index': 26
        },
        'loc': {
          'start': {
            'line': 5,
            'column': 31
          },
          'end': {
            'line': 5,
            'column': 32
          }
        },
        'tokenRange': [
          26,
          27
        ],
        'inferred': {
          'type': 'basic',
          'name': 'integer'
        }
      },
      'loc': {
        'start': {
          'line': 5,
          'column': 22
        },
        'end': {
          'line': 5,
          'column': 33
        }
      },
      'tokenRange': [
        24,
        28
      ],
      'inferred': {
        'type': 'basic',
        'name': 'number'
      }
    });
  });

  it('assign a value to array should be ok', function () {
    let ast = parse(`
      static function main(): void {
        var configs = [1,2,3];
        configs[3] = 4;
      }`, '__filename');
    let [, expr] = ast.moduleBody.nodes[0].functionBody.stmts.stmts;
    expect(expr.left).to.eql({
      'type': 'array_access',
      'id': {
        'tag': 2,
        'loc': {
          'start': {
            'line': 4,
            'column': 9
          },
          'end': {
            'line': 4,
            'column': 16
          }
        },
        'lexeme': 'configs',
        'index': 20,
        'type': 'variable'
      },
      'accessKey': {
        'type': 'number',
        'value': {
          'tag': 9,
          'loc': {
            'start': {
              'line': 4,
              'column': 17
            },
            'end': {
              'line': 4,
              'column': 18
            }
          },
          'value': 3,
          'type': 'integer',
          'index': 22
        },
        'loc': {
          'start': {
            'line': 4,
            'column': 17
          },
          'end': {
            'line': 4,
            'column': 18
          }
        },
        'tokenRange': [
          22,
          23
        ]
      },
      'loc': {
        'start': {
          'line': 4,
          'column': 9
        },
        'end': {
          'line': 4,
          'column': 20
        }
      },
      'inferred': {
        'type': 'basic',
        'name': 'integer'
      }
    });

    ast = parse(`
      static function main(): void {
        var data = {
          configs = [1,2,3]
        };
        data.configs[3] = 4;
      }`, '__filename');
    [, expr] = ast.moduleBody.nodes[0].functionBody.stmts.stmts;
    expect(expr.left).to.eql({
      'type': 'array_access',
      'id': {
        'tag': 2,
        'loc': {
          'start': {
            'line': 6,
            'column': 9
          },
          'end': {
            'line': 6,
            'column': 13
          }
        },
        'lexeme': 'data',
        'index': 24,
        'type': 'variable',
        'inferred': {
          'type': 'map',
          'keyType': {
            'type': 'basic',
            'name': 'string'
          },
          'valueType': {
            'type': 'array',
            'itemType': {
              'type': 'basic',
              'name': 'integer'
            }
          }
        }
      },
      'propertyPath': [
        {
          'tag': 2,
          'loc': {
            'start': {
              'line': 6,
              'column': 14
            },
            'end': {
              'line': 6,
              'column': 21
            }
          },
          'lexeme': 'configs',
          'index': 26
        }
      ],
      'accessKey': {
        'type': 'number',
        'value': {
          'tag': 9,
          'loc': {
            'start': {
              'line': 6,
              'column': 22
            },
            'end': {
              'line': 6,
              'column': 23
            }
          },
          'value': 3,
          'type': 'integer',
          'index': 28
        },
        'loc': {
          'start': {
            'line': 6,
            'column': 22
          },
          'end': {
            'line': 6,
            'column': 23
          }
        },
        'tokenRange': [
          28,
          29
        ]
      },
      'loc': {
        'start': {
          'line': 6,
          'column': 9
        },
        'end': {
          'line': 6,
          'column': 25
        }
      },
      'propertyPathTypes': [
        {
          'type': 'array',
          'itemType': {
            'type': 'basic',
            'name': 'integer'
          }
        }
      ],
      'inferred': {
        'type': 'basic',
        'name': 'integer'
      }
    });

    ast = parse(`
      model M {
        configs: [ number ]
      }
      static function main(): void {
        var m = new M{
          configs = [1,2,3]
        };
        m.configs[3] = 4;
      }`, '__filename');
    [, expr] = ast.moduleBody.nodes[1].functionBody.stmts.stmts;
    expect(expr.left).to.eql({
      'type': 'array_access',
      'id': {
        'tag': 2,
        'loc': {
          'start': {
            'line': 9,
            'column': 9
          },
          'end': {
            'line': 9,
            'column': 10
          }
        },
        'lexeme': 'm',
        'index': 35,
        'type': 'variable',
        'inferred': {
          'extendOn': undefined,
          'isException': false,
          'moduleName': undefined,
          'type': 'model',
          'name': 'M'
        }
      },
      'propertyPath': [
        {
          'tag': 2,
          'loc': {
            'start': {
              'line': 9,
              'column': 11
            },
            'end': {
              'line': 9,
              'column': 18
            }
          },
          'lexeme': 'configs',
          'index': 37
        }
      ],
      'accessKey': {
        'type': 'number',
        'value': {
          'tag': 9,
          'loc': {
            'start': {
              'line': 9,
              'column': 19
            },
            'end': {
              'line': 9,
              'column': 20
            }
          },
          'value': 3,
          'type': 'integer',
          'index': 39
        },
        'loc': {
          'start': {
            'line': 9,
            'column': 19
          },
          'end': {
            'line': 9,
            'column': 20
          }
        },
        'tokenRange': [
          39,
          40
        ]
      },
      'loc': {
        'start': {
          'line': 9,
          'column': 9
        },
        'end': {
          'line': 9,
          'column': 22
        }
      },
      'propertyPathTypes': [
        {
          'type': 'array',
          'itemType': {
            'type': 'basic',
            'name': 'number'
          }
        }
      ],
      'inferred': {
        'type': 'basic',
        'name': 'number'
      }
    });
    expect(() => {
      parse(`
        static function main(): void {
          var data = {
            configs = [1,2,3]
          };
          data.configs['3'] = 4;
        }`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`The key expr type must be number type`);
    });
  });

  it('moduleModel as map value type should ok', function () {
    let ast = readAndParse('fixtures/module_model_as_map_type/main.dara');
    const [model, init] = ast.moduleBody.nodes;
    expect(model.modelBody.nodes[0].fieldValue).to.eql({
      'type': 'fieldType',
      'fieldType': 'map',
      'keyType': {
        'tag': 8,
        'loc': {
          'start': {
            'line': 4,
            'column': 15
          },
          'end': {
            'line': 4,
            'column': 21
          }
        },
        'lexeme': 'string',
        'index': 10
      },
      'valueType': {
        'type': 'moduleModel',
        'path': [
          {
            'tag': 2,
            'loc': {
              'start': {
                'line': 4,
                'column': 22
              },
              'end': {
                'line': 4,
                'column': 25
              }
            },
            'lexeme': 'OSS',
            'index': 12,
            'idType': 'module'
          },
          {
            'tag': 2,
            'loc': {
              'start': {
                'line': 4,
                'column': 26
              },
              'end': {
                'line': 4,
                'column': 32
              }
            },
            'lexeme': 'Config',
            'index': 14
          }
        ],
        'loc': {
          'start': {
            'line': 4,
            'column': 22
          },
          'end': {
            'line': 4,
            'column': 32
          }
        }
      }
    });

    expect(init.initBody.stmts[0].expectedType).to.eql({
      'loc': {
        'start': {
          'line': 8,
          'column': 15
        },
        'end': {
          'line': 8,
          'column': 36
        }
      },
      'type': 'map',
      'keyType': {
        'tag': 8,
        'loc': {
          'start': {
            'line': 8,
            'column': 19
          },
          'end': {
            'line': 8,
            'column': 25
          }
        },
        'lexeme': 'string',
        'index': 25
      },
      'valueType': {
        'type': 'moduleModel',
        'path': [
          {
            'tag': 2,
            'loc': {
              'start': {
                'line': 8,
                'column': 26
              },
              'end': {
                'line': 8,
                'column': 29
              }
            },
            'lexeme': 'OSS',
            'index': 27,
            'idType': 'module'
          },
          {
            'tag': 2,
            'loc': {
              'start': {
                'line': 8,
                'column': 30
              },
              'end': {
                'line': 8,
                'column': 36
              }
            },
            'lexeme': 'Config',
            'index': 29
          }
        ],
        'loc': {
          'start': {
            'line': 8,
            'column': 26
          },
          'end': {
            'line': 8,
            'column': 36
          }
        }
      }
    });
  });

  it('no return should not ok', function () {
    expect(function () {
      parse(`
      static function main(): string {
      }`, '__filename');
    }).to.throwException(function (ex) {
      expect(ex).be.a(SyntaxError);
      expect(ex.message).to.be('no return statement');
    });
  });

  it('no return when void should ok', function () {
    expect(function () {
      parse(`
      static function main(): void {
      }`, '__filename');
    }).to.not.throwException();
  });

  it('return string should ok', function () {
    expect(function () {
      parse(`
      static function main(): string {
        return '';
      }`, '__filename');
    }).to.not.throwException();
  });

  it('no return but throw error should ok', function () {
    expect(function () {
      parse(`
      static function main(): string {
        throw {
          message = 'error'
        }
      }`, '__filename');
    }).to.not.throwException();
  });

  it('return string should ok', function () {
    expect(function () {
      parse(`
      static function main(): string {
        if (true) {
          return '';
        } else {
          return '';
        }
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      static function main(): string {
        if (true) {
        }
      }`, '__filename');
    }).to.throwException(function (ex) {
      expect(ex).be.a(SyntaxError);
      expect(ex.message).to.be('no return statement');
    });

    expect(function () {
      parse(`
      static function main(): string {
        if (true) {
          return '';
        }
      }`, '__filename');
    }).to.throwException(function (ex) {
      expect(ex).be.a(SyntaxError);
      expect(ex.message).to.be('no return statement');
    });

    expect(function () {
      parse(`
      static function main(): string {
        if (true) {
          return '';
        } else {

        }
      }`, '__filename');
    }).to.throwException(function (ex) {
      expect(ex).be.a(SyntaxError);
      expect(ex.message).to.be('no return statement');
    });

    expect(function () {
      parse(`
      static function main(): string {
        if (true) {
          return '';
        } else if (true) {

        }
      }`, '__filename');
    }).to.throwException(function (ex) {
      expect(ex).be.a(SyntaxError);
      expect(ex.message).to.be('no return statement');
    });

    expect(function () {
      parse(`
      static function main(): string {
        if (true) {
          return '';
        } else if (true) {
          return '';
        }
      }`, '__filename');
    }).to.throwException(function (ex) {
      expect(ex).be.a(SyntaxError);
      expect(ex.message).to.be('no return statement');
    });

    expect(function () {
      parse(`
      static function main(): string {
        '';
      }`, '__filename');
    }).to.throwException(function (ex) {
      expect(ex).be.a(SyntaxError);
      expect(ex.message).to.be('no return statement');
    });

    expect(function () {
      parse(`
      static function main(): string {
        try {
          return '';
        } finally {
          '';
        }
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      static function main(): string {
        try {
          '';
        } finally {
          return '';
        }
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      static function main(): string {
        try {
          return '';
        } catch(err) {
          return '';
        }
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      static function main(): string {
        try {
          return '';
        } catch(err) {
          return '';
        } finally {
          '';
        }
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      static function main(): string {
        try {
          '';
        } catch(err) {
          '';
        } finally {
          return '';
        }
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      static function main(): string {
        try {
          '';
        } catch(err) {
          return '';
        } finally {
          '';
        }
      }`, '__filename');
    }).to.throwException(function (ex) {
      expect(ex).be.a(SyntaxError);
      expect(ex.message).to.be('no return statement');
    });

    expect(function () {
      parse(`
      static function main(): string {
        try {
          return '';
        } catch(err) {
          '';
        } finally {
          '';
        }
      }`, '__filename');
    }).to.throwException(function (ex) {
      expect(ex).be.a(SyntaxError);
      expect(ex.message).to.be('no return statement');
    });
  });

  it('no return stmt in api should not ok', function () {
    expect(function () {
      parse(`
      api hello(): string {
        return '';
      } returns {

      }`, '__filename');
    }).to.throwException(function (ex) {
      expect(ex).be.a(SyntaxError);
      expect(ex.message).to.be('no return statement');
    });
  });

  it('assign map[string]model to map[string]any should ok', function () {
    expect(function () {
      parse(`
      model M{}
      static function main(): void {
        var m = new M{};
        var a: map[string]any = {
          m = m
        };
      }`, '__filename');
    }).to.not.throwException();
  });

  it('runtime block\'s env local should be separated with apiBody & returnBody', function () {
    expect(function () {
      parse(`
      init() {}

      api hello(): object {
        __request.method = 'GET';
        __request.pathname = '/';
        __request.headers = {
          host = 'www.test.com',
        };
        var retry = false;
      } returns {
        if(retry){
          return __request.headers;
        }
        return {};
      } runtime {

      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      init() {}

      api hello(retry: boolean): object {
        __request.method = 'GET';
        __request.pathname = '/';
        __request.headers = {
          host = 'www.test.com',
        };
        var test = retry;
      } returns {
        if(test){
          return __request.headers;
        }
        return {};
      } runtime {
        retry = retry
      }`, '__filename');
    }).to.not.throwException();
  });

  it('runtime inferred type should be map when return type is void', function () {
    const ast = parse(`
    init() {}

    api hello(): void {
      __request.method = 'GET';
      __request.pathname = '/';
      __request.headers = {
        host = 'www.test.com',
      };
      var retry = false;
    } returns {
      return;
    } runtime {

    }`, '__filename');
    const runtimeBody = ast.moduleBody.nodes[1].runtimeBody;
    expect(runtimeBody.inferred).to.eql({
      'type': 'map',
      'keyType': {
        'type': 'basic',
        'name': 'string'
      },
      'valueType': {
        'type':'basic',
        'name':'any'
      }
    });
  });

  it('api runtime option can use request & response varibles', function(){
    expect(function () {
      parse(`
      init() {}

      api hello(): object {
        __request.method = 'GET';
        __request.pathname = '/';
        __request.headers = {
          host = 'www.test.com',
        };
        var retry = false;
      } returns {
        if(retry){
          return __request.headers;
        }
        return {};
      } runtime {
        retry = retry
      }`, '__filename');
    }).to.not.throwException();


    expect(function () {
      parse(`
      init() {}

      exception Err{
        message: string,
        period: number,
      }

      api test(): number {
        __request.protocol = "https";
        __request.method = 'DELETE';
        __request.pathname = "/";
        __request.headers = {
          host = "test.aliyun.com",
          accept = 'application/json',
        };
        var req = {
          nextToken = "100",
          maxResults = 200,
        };
      } returns {
        var resp = {
          nextToken = "100",
          truncated = false,
          replicaPairs = "sdfs",
        };
        
        if(__response.statusCode == 402) {
          var err = new Err{
            message = 'err',
            period = 3,
          };
        }
        return __response.statusCode;
      } runtime {
        timeouted = 'retry',
        "$Error" = {
          retry = {
            retryable = false
          },
          backoff = {
            policy = 'no',
            period = 1
          },
        },
        "Err" = {
          retry = {
            retryable = true
          },
          backoff = {
            policy = 'yes',
            period = err.period
          },
        },
        paginated = {
          // token 翻页模式
          policy = "token",
          inputToken = req.nextToken,
          outputToken = resp.nextToken,
          maxItems = req.maxResults,
          maxItemsDefault = 20,
          pageTruncated = resp.truncated,
          totalCount = 100,
          items = resp.replicaPairs,
        }
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      init() {}

      api test(): number {
        __request.protocol = "https";
        __request.method = 'DELETE';
        __request.pathname = "/";
        __request.headers = {
          host = "test.aliyun.com",
          accept = 'application/json',
        };
      } returns {
        var resp = {
          nextToken = "100",
          truncated = false,
          replicaPairs = "sdfs",
        };
        return __response.statusCode;
      } runtime {
        timeouted = 'retry',
        "$Error" = {
          retry = {
            retryable = false
          },
          backoff = {
            policy = 'no',
            period = 1
          },
        },
        paginated = {
          // token 翻页模式
          policy = "token",
          outputToken = resp.nextToken,
          maxItemsDefault = 20,
          pageTruncated = resp.truncated,
          totalCount = 100,
          items = resp.replicaPairs,
          maxItems = req.maxResults,
        }
      }`, '__filename');
    }).to.throwException(function(ex) {
      expect(ex).be.a(SyntaxError);
      expect(ex.message).to.be('variable "req" undefined');
    });

  });

  it('parameter expected type is ok', function () {
    const ast = readAndParse('fixtures/params_expected_type/main.dara');
    const superArgs = ast.moduleBody.nodes[0].initBody.stmts[0].args[0].expectedType;
    const constructArgs = ast.moduleBody.nodes[0].initBody.stmts[1].expr.args[0].expectedType;

    const instanceCallArgs = ast.moduleBody.nodes[0].initBody.stmts[3].args[0].expectedType;
    const methodCallArgs = ast.moduleBody.nodes[0].initBody.stmts[4].args[0].expectedType;
    const staticArgs = ast.moduleBody.nodes[0].initBody.stmts[5].args[0].expectedType;
    expect(superArgs).to.be.eql({
      'type': 'basic',
      'name': 'string'
    });

    expect(constructArgs).to.be.eql({
      'type': 'basic',
      'name': 'string'
    });

    expect(instanceCallArgs).to.be.eql({
      'extendOn': undefined,
      'type': 'model',
      'name': 'Options',
      'moduleName': 'OSS'
    });

    expect(methodCallArgs).to.be.eql({
      'type': 'basic',
      'name': 'number'
    });

    expect(staticArgs).to.be.eql({
      'type': 'basic',
      'name': 'string'
    });
  });

  it('assign when map value type is model  should ok', function () {
    expect(function () {
      readAndParse('fixtures/map_model_assign/main.dara');
    }).to.not.throwException();
  });

  it('assign when map  value type which in array is model should ok', function () {
    let ast = parse(`
      model N {
        config: string,
      }

      model M {
        configs: [map[string]N]
      }

     

      static function main(m: M): void {
        var config = m.configs;
      }`, '__filename');
    const value = ast.moduleBody.nodes[1].modelBody.nodes[0].fieldValue;
    expect(value).to.eql({
      'type': 'fieldType',
      'fieldType': 'array',
      'fieldItemType': {
        'loc': {
          'start': {
            'line': 7,
            'column': 19
          },
          'end': {
            'line': 7,
            'column': 31
          }
        },
        'type': 'map',
        'keyType': {
          'tag': 8,
          'loc': {
            'start': {
              'line': 7,
              'column': 23
            },
            'end': {
              'line': 7,
              'column': 29
            }
          },
          'lexeme': 'string',
          'index': 17
        },
        'valueType': {
          'tag': 2,
          'loc': {
            'start': {
              'line': 7,
              'column': 30
            },
            'end': {
              'line': 7,
              'column': 31
            }
          },
          'lexeme': 'N',
          'index': 19,
          'idType': 'model'
        }
      }
    });
  });

  it('map value type is model should ok', function () {
    let ast = parse(`
      model M {
        configs: map[string]N
      }

      model N {
        config: string,
      }

      static function main(m: M): void {
        var config = m.configs;
      }`, '__filename');
    const [expr] = ast.moduleBody.nodes[2].functionBody.stmts.stmts;
    expect(expr.expr).to.eql({
      'type': 'property_access',
      'id': {
        'tag': 2,
        'loc': {
          'start': {
            'line': 11,
            'column': 22
          },
          'end': {
            'line': 11,
            'column': 23
          }
        },
        'lexeme': 'm',
        'index': 34,
        'type': 'variable',
        'inferred': {
          'extendOn': undefined,
          'moduleName': undefined,
          'type': 'model',
          'name': 'M'
        }
      },
      'propertyPath': [
        {
          'tag': 2,
          'loc': {
            'start': {
              'line': 11,
              'column': 24
            },
            'end': {
              'line': 11,
              'column': 31
            }
          },
          'lexeme': 'configs',
          'index': 36
        }
      ],
      'loc': {
        'start': {
          'line': 11,
          'column': 22
        },
        'end': {
          'line': 11,
          'column': 31
        }
      },
      'tokenRange': [
        34,
        37
      ],
      'propertyPathTypes': [
        {
          'type': 'map',
          'keyType': {
            'type': 'basic',
            'name': 'string'
          },
          'valueType': {
            'extendOn': undefined,
            'moduleName': undefined,
            'type': 'model',
            'name': 'N'
          }
        }
      ],
      'inferred': {
        'type': 'map',
        'keyType': {
          'type': 'basic',
          'name': 'string'
        },
        'valueType': {
          'extendOn': undefined,
          'moduleName': undefined,
          'type': 'model',
          'name': 'N'
        }
      }
    });
  });

  it('string or number enum should ok', function () {
    expect(function () {
      parse(`
      enum E: string {
        str(value='str', description='str'),
      }
    `, '__filename');
    }).to.not.throwException();

    expect(() => {
      parse(`
      enum E: number {
        num(value=123, description='num'),
      }
    `, '__filename');
    }).to.not.throwException();

    expect(() => {
      parse(`
      enum E: int16 {
        num(value=123, description='num'),
      }
    `, '__filename');
    }).to.not.throwException();

    expect(() => {
      parse(`
      enum E: float {
        num(value=12.3, description='num'),
      }
    `, '__filename');
    }).to.not.throwException();

    expect(() => {
      parse(`
      enum E: long {
        num(value=123L, description='num'),
      }
    `, '__filename');
    }).to.not.throwException();

    expect(() => {
      parse(`
      enum E: double {
        num(value=12.3d, description='num'),
      }
    `, '__filename');
    }).to.not.throwException();

    expect(() => {
      parse(`
      enum E: string {
        str(value='str'),
      }
    `, '__filename');
    }).to.not.throwException();
  });


  it('wrong value type enum should not ok', function () {
    expect(() => {
      parse(`
      enum E: number {
        str(value='str', description='str'),
      }
    `, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('the enum types are mismatched. expected number, but string');
    });

    expect(() => {
      parse(`
      enum E: string {
        num(value=123, description='num'),
      }
    `, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('the enum types are mismatched. expected string, but integer');
    });

    expect(() => {
      parse(`
      enum E: integer {
        num(value=12.3, description='num'),
      }
    `, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('the enum types are mismatched. expected integer, but float');
    });
  });

  it('enum has wrong attr should not ok', function () {
    expect(() => {
      parse(`
      enum E: string {
        str(description='str'),
      }
    `, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('enum "E" must have attribute "value".');
    });

    expect(() => {
      parse(`
      enum E: string {
        str(value='str', value=123, description='str'),
      }
    `, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('the enum attribute "value" is redefined.');
    });
  });

  it('assign enum to value type variable should ok', function () {
    expect(() => {
      parse(`
      type @e = E

      enum E: string {
        str(value='str', description='str'),
      }

      model M {
        m: E
      }

      init(){
        var str: E = E.str;
        @e = E.str;
        var e = new M {
          m = E.str
        };
      }
    `, '__filename');
    }).to.not.throwException();
  });

  it('assign enum to wrong type variable should not ok', function () {
    expect(() => {
      parse(`
      type @e = string

      enum E: string {
        str(value='str', description='str'),
      }

      init(){
        @e = E.str;
      }
    `, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('can\'t assign E to string');
    });
  });

  it('assign module enum should ok', function () {
    expect(function () {
      readAndParse('fixtures/declare_module_model/main.dara');
    }).to.not.throwException();
  });

  it('assign derived module to basic module should ok', function () {
    expect(function () {
      readAndParse('fixtures/assign_derived_module/main.dara');
    }).to.not.throwException();
  });

  it('return type can be set in usedExternModel', function () {
    let ast = readAndParse('fixtures/extern_model/main.dara');
    // expect(ast.usedTypes.has('readable')).to.be(true);
    expect(ast.usedExternModel.get('OSS').has('MyModel')).to.eql(true);
    expect(ast.usedExternModel.get('OSS').has('string')).to.eql(false);
    expect(ast.usedExternModel.get('OSS').has('Config')).to.eql(true);
    expect(ast.usedExternModel.get('OSS').has('map')).to.eql(false);
    expect(ast.usedExternModel.get('OSS').has(undefined)).to.eql(false);
    ast = readAndParse('fixtures/extern_model/call_static_method.dara');
    expect(ast.usedExternModel.get('OSS').has('MyModel')).to.eql(true);
    expect(ast.usedExternModel.get('OSS').has('Config')).to.eql(true);
    expect(ast.usedExternModel.get('OSS').has('string')).to.eql(false);
    expect(ast.usedExternModel.get('OSS').has('map')).to.eql(false);
    expect(ast.usedExternModel.get('OSS').has(undefined)).to.eql(false);
    ast = readAndParse('fixtures/extern_model/map_value_extern_model.dara');
    expect(ast.usedExternModel.get('Map').has('MyModel')).to.eql(true);
  });

  it('use typedef should ok', function () {
    expect(() => {
      parse(`
      typedef HttpResponse
      typedef HttpRequest

      type @vid=HttpRequest

      model M {
        a: HttpResponse,
        b: HttpRequest
      }

      static function TestA(a: HttpResponse, b: HttpRequest): string;

      static function TestB(a: string) throws : HttpResponse;
    `, '__filename');
    }).to.not.throwException();
  });

  it('assign typedef type should ok', function () {
    expect(() => {
      parse(`
      typedef HttpResponse
      type @vid=HttpResponse
      
      model M {
        a: HttpResponse
      }

      init(a: HttpResponse){
        @vid = a;
        var m = new M{
          a = a
        };
      }
    `, '__filename');
    }).to.not.throwException();
  });


  it('assign typedef wrong type should not ok', function () {
    expect(() => {
      parse(`
      typedef HttpResponse
      type @vid=HttpResponse

      init(a: string){
        @vid = a;
      }
    `, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('can\'t assign string to HttpResponse');
    });
  });

  it('use module deftype should ok', function () {
    expect(function () {
      readAndParse('fixtures/assign_module_typedef/main.dara');
    }).to.not.throwException();
  });

  it('use module submodel should ok', function () {
    expect(function () {
      readAndParse('fixtures/module_submodel_call/main.dara');
    }).to.not.throwException();
  });

  it('[  map[string]any ] assign should be ok', function () {
    expect(() => {
      parse(`
      model A {
        a: string
      }
      model M {
        a: [  map[string]any ],
        b: [ map[string]A ]
      }

      init(){
        var m = new M{
          a = [
            {
              test = 'test' 
            }
          ],
          b = [
            {
              test = new A{
                a = 'test'
              }
            }
          ]
        };
      }
    `, '__filename');
    }).to.not.throwException();
  });

  it('use inner module should ok', function () {
    let ast = readAndParse('fixtures/multi_module/sdk.dara');
    
    const userAst = ast.innerDep.get('User');
    const [model] = userAst.moduleBody.nodes;
    expect(model.type).to.be('model');
    expect(model.modelName).to.eql({
      'tag': 2,
      'loc': 
      {
        'start': {
          'line': 4,
          'column': 7
        },
        'end': 
        {
          'line': 4,
          'column': 11
        }
      },
      'lexeme':'Info',
      'index': 9
    });

    const utilAst = ast.innerDep.get('Util');
    const [ func ] = utilAst.moduleBody.nodes;
    expect(func.type).to.be('function');
    expect(func.functionName).to.eql({
      'tag': 2,
      'loc': {
        'start': {
          'line': 1,
          'column': 17
        },
        'end': {
          'line': 1,
          'column': 22
        }
      },
      'lexeme': 'test1',
      'index': 3
    });

    const apiAst = ast.innerDep.get('API');
    const [ init, api ] = apiAst.moduleBody.nodes;
    expect(init.type).to.be('init');
    expect(api.type).to.be('api');
    expect(api.apiName).to.eql({
      'tag': 2,
      'loc': {
        'start': {
          'line': 7,
          'column': 5
        },
        'end': {
          'line': 7,
          'column': 10
        }
      },
      'lexeme': 'test3',
      'index': 15
    });
  });

  it('increment/decrement from a number variable should ok', function () {
    expect(function () {
      parse(`static function callOSS(): void {
        var a: int8 = 3;
        var b: uint8 = 3;
        var c: int16 = 3;
        var d: uint16 = 3;
        var e: int32 = 3;
        var f: uint32 = 3;
        var g: long = 3L;
        var h: ulong = 3L;
        var j: float = 3.0;
        var k: double = 3.0d;
        var l: integer = 3;
        var m: number = 3;
        a++;
        ++a;
        a--;
        --a;
        b++;
        ++b;
        b--;
        --b;
        c++;
        ++c;
        c--;
        --c;
        d++;
        ++d;
        d--;
        --d;
        e++;
        ++e;
        e--;
        --e;
        f++;
        ++f;
        f--;
        --f;
        g++;
        ++g;
        g--;
        --g;
        h++;
        ++h;
        h--;
        --h;
        j++;
        ++j;
        j--;
        --j;
        k++;
        ++k;
        k--;
        --k;
        l++;
        ++l;
        l--;
        --l;
        m++;
        ++m;
        m--;
        --m;
        return;
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      static function callOSS(): void {
        var a = '3';
        ++a;
        return;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('the increment/decrement expr must be number type');
    });

    expect(function () {
      parse(`
      static function callOSS(): void {
        var a = true;
        a++;
        return;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('the increment/decrement expr must be number type');
    });

    expect(function () {
      parse(`
      model M {};
      static function callOSS(): void {
        var a = new M;
        a--;
        return;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('the increment/decrement expr must be number type');
    });

    expect(function () {
      parse(`
      model M {};
      static function callOSS(): void {
        var a = new M;
        --a;
        return;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('the increment/decrement expr must be number type');
    });
  });

  it('group type check should ok', function () {
    expect(function () {
      parse(`static function callOSS(): void {
        var a = "string";
        var b = 3;
        if((a == "string") || (b >= 2)) {
          return;
        }
        return;
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`static function callOSS(): void {
        var a = "string";
        var b = 3;
        if((a + "string") || (b >= 2)) {
          return;
        }
        return;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('the left expr must be boolean type');
    });
  });

  it('binary operation check should ok', function () {
    expect(function () {
      parse(`static function callOSS(): number {
        var a = 4;
        var b = 3;
        var c = a + b;
        var d = c - b;
        var e = c * d;
        var f = e / d;
        return (a + b) * c / d;
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      static function callOSS(): number {
        var a: integer = 3;
        var b: number = 3;
        return a - b;
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      static function callOSS(): string {
        var a = '3' + '4';
        return a;
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      static function callOSS(): number {
        var a: long = 3;
        var b: number = 3;
        return a - b;
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      static function callOSS(): void {
        var a = 'a' + 'b';
        var c = a / 3;
        return;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('div can only operate number type, but left: string and right: integer');
    });

    expect(function () {
      parse(`
      static function callOSS(): void {
        var a = 3 * 3.0;
        return;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('integer can only multi with integer type, but float');
    });

    expect(function () {
      parse(`
      static function callOSS(): int8 {
        var a: int8 = 3;
        var b: uint8 = 3;
        return a + b;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('int8 can only add with int8 type, but uint8');
    });

    expect(function () {
      parse(`
      static function callOSS(): int8 {
        var a: int16 = 3;
        var b: uint16 = 3;
        return a / b;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('int16 can only div with int16 type, but uint16');
    });

    expect(function () {
      parse(`
      static function callOSS(): int8 {
        var a: int32 = 3;
        var b: uint32 = 3;
        return a * b;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('int32 can only multi with int32 type, but uint32');
    });

    expect(function () {
      parse(`
      static function callOSS(): long {
        var a = 3L;
        var b = 3d;
        return a - b;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('long can only subtract with long type, but double');
    });

  });

  it('extend a module model/exception shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/extend_model/main.dara');
    }).to.not.throwException();

  });

  it('use array builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/array.dara');
    }).to.not.throwException();
  });

  it('use string builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/string.dara');
    }).to.not.throwException();
  });

  it('use bytes builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/bytes.dara');
    }).to.not.throwException();
  });

  it('use number builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/number.dara');
    }).to.not.throwException();
  });

  it('use map builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/map.dara');
    }).to.not.throwException();
  });

  it('use url builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/url.dara');
    }).to.not.throwException();
  });

  it('use xml builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/xml.dara');
    }).to.not.throwException();
  });

  it('use form builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/form.dara');
    }).to.not.throwException();
  });

  it('use json builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/json.dara');
    }).to.not.throwException();
  });

  it('use env builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/env.dara');
    }).to.not.throwException();
  });

  it('use date builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/date.dara');
    }).to.not.throwException();
  });

  it('use file builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/file.dara');
    }).to.not.throwException();
  });

  it('use stream builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/stream.dara');
    }).to.not.throwException();
  });

  it('use loggers builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/logger.dara');
    }).to.not.throwException();
  });

  it('use model builtin module shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_module/model.dara');
    }).to.not.throwException();
  });

  it('use builtin functions shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_function/function.dara');
    }).to.not.throwException();
  });

  it('use builtin models shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/builtin_model/model.dara');
    }).to.not.throwException();
  });

  it('use extend model assign shoule be ok', function(){
    expect(function () {
      parse(`
      model base {};

      model sub extends base {};

      model sub2 extends sub {};

      model sub3 extends sub2 {};

      model sub4 extends sub3 {};

      model TestError extends $Error {
        message: string,
      };

      model TestRespError extends $ResponseError {
        data: string,
      };

      static function callOSS(): void {
        var a: base = new sub4;

        var b: base = new sub3;

        var c: base = new sub2;

        var d: base = new sub;

        var e: sub = new sub2;

        var f: sub2 = new sub3;

        var g: sub3 = new sub4;

        var h: $Model = new base;

        var j: $Error = new TestError{
          message = "true",
        };

        var k: $ResponseError = new TestRespError {
          code = "TestResp",
          statusCode = 401,
          retryAfter = 10 * 1000,
          data = "{}"
        };
        
        return;
      }`, '__filename');
    }).to.not.throwException();


    expect(function () {
      parse(`
      model m {
        sub: {
          name: string,
          sub: {
            name: string,
          },
          base: $Model,
        }
      };

      model sub extends m.sub {
        
      };

      
      model sub2 extends m.sub.sub {};

      static function callOSS(): void {
        var b = new sub2 {
          name = "name",
        };
        var a: m.sub = new sub {
          name = "name",
          sub = b,
          base = b,
        };
        return;
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      model m {
        sub: {
          name: string,
          sub: {
            name: string,
          },
          base: $Model,
        }
      };

      model sub extends m.sub {
        
      };

      
      model sub2 extends m.sub.sub {};

      static function callOSS(): void {
        var b = new sub2 {
          age = 24,
        };
        return;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('the property "age" is undefined in model "sub2"');
    });

    expect(function () {
      parse(`
      model base {};

      model sub extends base {};

      model other {};

      static function callOSS(): void {
        var b: base = new other;
        return;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('declared variable with mismatched type, expected: base, actual: other');
    });
  });

  it('exceptions all extend from $Error shoule be ok', function(){ 
    expect(function () {
      parse(`
      exception TestError {};

      static function callOSS(): void {
        var j: $Error = new TestError{
          message = "true",
          code = "Error"
        };
        
        return;
      }`, '__filename');
    }).to.not.throwException();

    expect(function () {
      parse(`
      exception TestError {};

      static function callOSS(): void {
        var j: $Error = new TestError{
          message = "true",
          statusCode = 200
        };
        
        return;
      }`, '__filename');
    }).to.throwException(function(e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be('the property "statusCode" is undefined in model "TestError"');
    });
  });

  it('use multi catch blocks shoule be ok', function(){
    expect(function () {
      readAndParse('fixtures/multi_catch/main.dara');
    }).to.not.throwException();
  });
});