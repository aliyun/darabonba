'use strict';

const expect = require('expect.js');

const Parser = require('../lib/parser');
const Lexer = require('../lib/lexer');

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

function string(val, sl, sc, el, ec, ti, ts, te) {
  return {
    'type': 'string',
    'loc': loc(sl, sc, el, ec),
    'tokenRange': [ts, te],
    'value': {
      'index': ti,
      'loc': loc(sl, sc, el, ec),
      'string': val,
      'tag': 1
    }
  };
}

describe('parser', function () {

  it('empty module should ok', function () {
    expect(parse('', '__filename')).to.be.eql({
      'annotation': undefined,
      'comments': {},
      'imports': [],
      'extends': undefined,
      'moduleBody': {
        'nodes': [],
        'type': 'moduleBody'
      },
      'type': 'module'
    });

    expect(parse(`
/**
 * module description
 */
`, '__filename')).to.be.eql({
      'imports': [],
      'extends': undefined,
      'comments': {},
      'annotation': {
        'index': 1,
        'tag': 19,
        'value': '/**\n * module description\n */',
        'loc': loc(2, 1, 4, 4)
      },
      'moduleBody': {
        'nodes': [],
        'type': 'moduleBody'
      },
      'type': 'module'
    });
  });

  it('const should be ok', function () {
    function moduleBody(value) {
      var ast = parse(value, '__filename');
      return ast.moduleBody.nodes;
    }

    expect(() => {
      moduleBody('const');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect ID, but EOF`);
    });

    expect(() => {
      moduleBody('const id');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect =, but EOF`);
    });

    expect(() => {
      moduleBody('const id = ');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. const value must be STRING/NUMBER/BOOLEAN`);
    });

    expect(() => {
      moduleBody('const id = "string"');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect ;, but EOF`);
    });

    expect(moduleBody('const id = "string";')).to.be.eql([
      {
        'annotation': undefined,
        'constName': {
          'index': 2,
          'lexeme': 'id',
          'tag': 2,
          loc: loc(1, 7, 1, 9)
        },
        'constValue': {
          'index': 4,
          'string': 'string',
          'tag': 1,
          loc: loc(1, 13, 1, 19)
        },
        'type': 'const',
        'tokenRange': [1, 5]
      }
    ]);

    expect(moduleBody('const id = 123;')).to.be.eql([
      {
        'annotation': undefined,
        'constName': {
          'index': 2,
          'lexeme': 'id',
          'tag': 2,
          loc: loc(1, 7, 1, 9)
        },
        'constValue': {
          'index': 4,
          'value': 123,
          'type': 'integer',
          'tag': 9,
          loc: loc(1, 12, 1, 15)
        },
        'type': 'const',
        'tokenRange': [1, 5]
      }
    ]);
  });

  it('type should be ok', function () {
    function moduleBody(value) {
      var ast = parse(`
        ${value}
      `, '__filename');
      return ast.moduleBody;
    }

    expect(() => {
      moduleBody('type');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect VID, but EOF`);
    });

    expect(() => {
      moduleBody('type @id');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect =, but EOF`);
    });

    expect(() => {
      moduleBody('type @id = ');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. expect base type, model id or array form`);
    });

    expect(moduleBody('type @id = string')).to.be.eql({
      'nodes': [
        {
          'annotation': undefined,
          'type': 'type',
          'vid': {
            'index': 2,
            'lexeme': '@id',
            'tag': 3,
            loc: loc(2, 14, 2, 17)
          },
          'value': {
            'index': 4,
            'lexeme': 'string',
            'tag': 8,
            loc: loc(2, 20, 2, 26)
          },
          'tokenRange': [1, 5]
        }
      ],
      'type': 'moduleBody'
    });

    expect(moduleBody('type @id = map[string]string')).to.be.eql({
      'nodes': [
        {
          'annotation': undefined,
          'tokenRange': [1, 9],
          'type': 'type',
          'vid': {
            'index': 2,
            'lexeme': '@id',
            'tag': 3,
            loc: loc(2, 14, 2, 17)
          },
          'value': {
            keyType: {
              index: 6,
              lexeme: 'string',
              loc: loc(2, 24, 2, 30),
              tag: 8
            },
            valueType: {
              'index': 8,
              'lexeme': 'string',
              'tag': 8,
              loc: loc(2, 31, 2, 37)
            },
            type: 'map',
            'loc': loc(2, 20, 2, 37)
          }
        }
      ],
      'type': 'moduleBody'
    });

    expect(moduleBody('type @id = [ string ]')).to.be.eql({
      'nodes': [
        {
          'annotation': undefined,
          'tokenRange': [1, 7],
          'type': 'type',
          'vid': {
            'index': 2,
            'lexeme': '@id',
            'tag': 3,
            loc: loc(2, 14, 2, 17)
          },
          'value': {
            'subType': {
              'index': 5,
              'lexeme': 'string',
              'tag': 8,
              loc: loc(2, 22, 2, 28)
            },
            'type': 'array'
          }
        }
      ],
      'type': 'moduleBody'
    });

    // with ; should ok
    expect(moduleBody('type @id = string;')).to.be.eql({
      'nodes': [
        {
          'annotation': undefined,
          'tokenRange': [1, 5],
          'type': 'type',
          'vid': {
            'index': 2,
            'lexeme': '@id',
            'tag': 3,
            loc: loc(2, 14, 2, 17)
          },
          'value': {
            'index': 4,
            'lexeme': 'string',
            'tag': 8,
            loc: loc(2, 20, 2, 26)
          }
        }
      ],
      'type': 'moduleBody'
    });
  });

  it('model should be ok', function () {
    function moduleBody(value) {
      var ast = parse(`
        ${value}
      `, '__filename');
      return ast.moduleBody;
    }

    expect(() => {
      moduleBody('model');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect ID, but EOF`);
    });

    expect(() => {
      moduleBody('model id = {');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. only id is allowed`);
    });

    expect(moduleBody('model id = {}')).to.be.eql({
      'nodes': [
        {
          'annotation': undefined,
          'tokenRange': [1, 5],
          'modelBody': {
            'nodes': [],
            'tokenRange': [4, 5],
            'type': 'modelBody'
          },
          'modelName': {
            'index': 2,
            'lexeme': 'id',
            'tag': 2,
            loc: loc(2, 15, 2, 17)
          },
          'type': 'model',
        }
      ],
      'type': 'moduleBody'
    });

    expect(moduleBody('model id {}')).to.be.eql({
      'nodes': [
        {
          'annotation': undefined,
          'modelBody': {
            'nodes': [],
            'tokenRange': [3, 4],
            'type': 'modelBody'
          },
          'modelName': {
            'index': 2,
            'lexeme': 'id',
            'tag': 2,
            loc: loc(2, 15, 2, 17)
          },
          'tokenRange': [1, 4],
          'type': 'model',
        }
      ],
      'type': 'moduleBody'
    });

    expect(moduleBody('model id = {};')).to.be.eql({
      'nodes': [
        {
          'annotation': undefined,
          'modelBody': {
            'nodes': [],
            'tokenRange': [4, 5],
            'type': 'modelBody'
          },
          'modelName': {
            'index': 2,
            'lexeme': 'id',
            'tag': 2,
            loc: loc(2, 15, 2, 17)
          },
          'type': 'model',
          'tokenRange': [1, 6],
        }
      ],
      'type': 'moduleBody'
    });
  });

  it('model field should be ok', function () {
    function modelField(value) {
      var ast = parse(`
        model id = {
          ${value}
        }
      `, '__filename');
      return ast.moduleBody.nodes[0].modelBody;
    }

    expect(() => {
      modelField('?');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: ?. only id is allowed`);
    });

    expect(() => {
      modelField(`name`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect :, but }`);
    });

    expect(() => {
      modelField(`name?`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect :, but }`);
    });

    expect(() => {
      modelField(`name?:`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. expect "{", "[", "string", "number", "map", ID`);
    });

    expect(modelField(`name?: string`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'name',
            'tag': 2,
            loc: loc(3, 11, 3, 15)
          },
          'fieldValue': {
            'fieldType': 'string',
            'type': 'fieldType'
          },
          'required': false,
          'tokenRange': [5, 9],
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 9],
      'type': 'modelBody'
    });

    expect(modelField(`object?: string`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'object',
            'tag': 2,
            loc: loc(3, 11, 3, 17)
          },
          'fieldValue': {
            'fieldType': 'string',
            'type': 'fieldType'
          },
          'required': false,
          'tokenRange': [5, 9],
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 9],
      'type': 'modelBody'
    });

    expect(modelField(`new?: string`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'new',
            'tag': 2,
            loc: loc(3, 11, 3, 14)
          },
          'fieldValue': {
            'fieldType': 'string',
            'type': 'fieldType'
          },
          'required': false,
          'tokenRange': [5, 9],
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 9],
      'type': 'modelBody'
    });

    expect(modelField(`rpc?: string`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'rpc',
            'tag': 2,
            loc: loc(3, 11, 3, 14)
          },
          'fieldValue': {
            'fieldType': 'string',
            'type': 'fieldType'
          },
          'required': false,
          'tokenRange': [5, 9],
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 9],
      'type': 'modelBody'
    });

    expect(modelField(`super?: string`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'super',
            'tag': 2,
            loc: loc(3, 11, 3, 16)
          },
          'fieldValue': {
            'fieldType': 'string',
            'type': 'fieldType'
          },
          'required': false,
          'tokenRange': [5, 9],
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 9],
      'type': 'modelBody'
    });

    expect(modelField(`number?: string`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'number',
            'tag': 2,
            loc: loc(3, 11, 3, 17)
          },
          'fieldValue': {
            'fieldType': 'string',
            'type': 'fieldType'
          },
          'required': false,
          'tokenRange': [5, 9],
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 9],
      'type': 'modelBody'
    });

    expect(modelField(`name?: ID`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'name',
            'tag': 2,
            loc: loc(3, 11, 3, 15)
          },
          'fieldValue': {
            'fieldType': {
              'index': 8,
              'lexeme': 'ID',
              'tag': 2,
              loc: loc(3, 18, 3, 20)
            },
            'type': 'fieldType'
          },
          'tokenRange': [5, 9],
          'required': false,
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 9],
      'type': 'modelBody'
    });

    expect(modelField(`name?: {}`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'name',
            'tag': 2,
            loc: loc(3, 11, 3, 15)
          },
          'fieldValue': {
            'nodes': [],
            'tokenRange': [8, 9],
            'type': 'modelBody'
          },
          'required': false,
          'tokenRange': [5, 10],
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 10],
      'type': 'modelBody'
    });

    expect(() => {
      modelField(`name?: [`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. expect type or model name`);
    });

    expect(() => {
      modelField(`name?: [ {`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect ], but EOF`);
    });

    expect(modelField(`name?: [{}]`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'name',
            'tag': 2,
            loc: loc(3, 11, 3, 15)
          },
          'fieldValue': {
            'fieldType': 'array',
            'fieldItemType': {
              'nodes': [],
              'tokenRange': [9, 10],
              'type': 'modelBody'
            },
            'type': 'fieldType'
          },
          'tokenRange': [5, 12],
          'required': false,
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 12],
      'type': 'modelBody'
    });

    expect(modelField(`name?: [ string ]`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'name',
            'tag': 2,
            loc: loc(3, 11, 3, 15)
          },
          'fieldValue': {
            'fieldType': 'array',
            'fieldItemType': {
              'index': 9,
              'lexeme': 'string',
              'tag': 8,
              loc: loc(3, 20, 3, 26)
            },
            'type': 'fieldType'
          },
          'tokenRange': [5, 11],
          'required': false,
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 11],
      'type': 'modelBody'
    });

    expect(modelField(`name: string,`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'name',
            'tag': 2,
            loc: loc(3, 11, 3, 15)
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
      'tokenRange': [4, 9],
      'type': 'modelBody'
    });

    expect(modelField(`name: [ map[string]any ],`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'name',
            'tag': 2,
            loc: loc(3, 11, 3, 15)
          },
          'fieldValue': {
            'fieldItemType': {
              'keyType': {
                'index': 10,
                'lexeme': 'string',
                'loc': loc(3, 23, 3, 29),
                'tag': 8
              },
              'type': 'map',
              'valueType': {
                'index': 12,
                'lexeme': 'any',
                'loc': loc(3, 30, 3, 33),
                'tag': 8
              },
              loc: loc(3, 19, 3, 33)
            },
            'fieldType': 'array',
            'type': 'fieldType'
          },
          'tokenRange': [5, 14],
          'required': true,
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 15],
      'type': 'modelBody'
    });

    expect(modelField(`name?: string, name2: string`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'lexeme': 'name',
            'index': 5,
            'tag': 2,
            loc: loc(3, 11, 3, 15)
          },
          'fieldValue': {
            'fieldType': 'string',
            'type': 'fieldType'
          },
          'tokenRange': [5, 9],
          'required': false,
          'type': 'modelField'
        },
        {
          'attrs': [],
          'fieldName': {
            'index': 10,
            'lexeme': 'name2',
            'tag': 2,
            loc: loc(3, 26, 3, 31)
          },
          'fieldValue': {
            'fieldType': 'string',
            'type': 'fieldType'
          },
          'tokenRange': [10, 13],
          'required': true,
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 13],
      'type': 'modelBody'
    });

    expect(modelField(`name?: string, name2: string,`)).to.be.eql({
      'nodes': [
        {
          'attrs': [],
          'fieldName': {
            'index': 5,
            'lexeme': 'name',
            'tag': 2,
            loc: loc(3, 11, 3, 15)
          },
          'fieldValue': {
            'fieldType': 'string',
            'type': 'fieldType'
          },
          'tokenRange': [5, 9],
          'required': false,
          'type': 'modelField'
        },
        {
          'attrs': [],
          'fieldName': {
            'index': 10,
            'lexeme': 'name2',
            'tag': 2,
            loc: loc(3, 26, 3, 31)
          },
          'fieldValue': {
            'fieldType': 'string',
            'type': 'fieldType'
          },
          'tokenRange': [10, 13],
          'required': true,
          'type': 'modelField'
        }
      ],
      'tokenRange': [4, 14],
      'type': 'modelBody'
    });

    expect(() => {
      modelField(`name: string {`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: {. expect ","`);
    });
  });

  it('model filed attrs should be ok', function () {
    function modelFieldAttrs(value) {
      var ast = parse(`
        model id = {
          name: string${value}
        }
      `, '__filename');
      return ast.moduleBody.nodes[0].modelBody.nodes[0].attrs;
    }

    expect(() => {
      modelFieldAttrs('(');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ID, but }`);
    });

    expect(() => {
      modelFieldAttrs('(id');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect =, but }`);
    });

    expect(() => {
      modelFieldAttrs('(id=');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. expect string, number, bool`);
    });

    expect(() => {
      modelFieldAttrs('(id="attr_value"');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ,, but }`);
    });

    expect(() => {
      modelFieldAttrs('(id="attr_value",');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ID, but }`);
    });

    expect(modelFieldAttrs('(id="attr_value")')).to.be.eql([
      {
        'attrName': {
          'index': 9,
          'lexeme': 'id',
          'tag': 2,
          loc: loc(3, 24, 3, 26)
        },
        'attrValue': {
          'index': 11,
          'string': 'attr_value',
          'tag': 1,
          loc: loc(3, 28, 3, 38)
        },
        'type': 'attr'
      }
    ]);

    expect(modelFieldAttrs('(id="attr_value",id2="value2")')).to.be.eql([
      {
        'attrName': {
          'index': 9,
          'lexeme': 'id',
          'tag': 2,
          loc: loc(3, 24, 3, 26)
        },
        'attrValue': {
          'index': 11,
          'string': 'attr_value',
          'tag': 1,
          loc: loc(3, 28, 3, 38)
        },
        'type': 'attr'
      },
      {
        'attrName': {
          'index': 13,
          'lexeme': 'id2',
          'tag': 2,
          loc: loc(3, 40, 3, 43)
        },
        'attrValue': {
          'index': 15,
          'string': 'value2',
          'tag': 1,
          loc: loc(3, 45, 3, 51)
        },
        'type': 'attr'
      }
    ]);
  });

  it('api() should ok', function () {
    function api(value) {
      var ast = parse(`
        api ${value}
      `, '__filename');
      return ast.moduleBody.nodes[0].modelBody.nodes[0].attrs;
    }

    expect(() => {
      api('');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect ID, but EOF`);
    });

    expect(() => {
      api('id');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect (, but EOF`);
    });

    expect(() => {
      api('id(');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect ID, but EOF`);
    });

    expect(() => {
      api('id(name');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect :, but EOF`);
    });

    expect(() => {
      api('id(name: ');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. expect base type, model id or array form`);
    });

    expect(() => {
      api('id(name: string');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect ,, but EOF`);
    });

    expect(() => {
      api('id(name: string =');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect STRING, but EOF`);
    });

    expect(() => {
      api('id()');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect :, but EOF`);
    });
  });

  it('api() params should ok', function () {
    function params(value) {
      var ast = parse(`
        api id(${value}): string {
          method = "GET";
          pathname = "/";
        }
      `, '__filename');

      const api = ast.moduleBody.nodes[0];
      return api.params.params;
    }

    expect(params('')).to.eql([]);

    expect(params('id: string')).to.eql([
      {
        'defaultValue': null,
        'paramName': {
          'index': 4,
          'lexeme': 'id',
          'tag': 2,
          loc: loc(2, 16, 2, 18)
        },
        'paramType': {
          'index': 6,
          'lexeme': 'string',
          'loc': loc(2, 20, 2, 26),
          'tag': 8
        },
        'type': 'param'
      }
    ]);
  });

  it('api() return type should ok', function () {
    expect(() => {
      parse(`
        api id(): {

        }
      `, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: {. expect base type, model ` +
        `id or array form`);
    });

    expect(() => {
      parse(`
        api id(): string {

        }
      `, '__filename');
    }).to.not.throwException();
  });

  it('api() returnBody should ok', function () {
    function returns(value) {
      var ast = parse(`
        api id(): string {
          __request.method = "GET";
          __request.pathname = "/";
        } returns ${value}
      `, '__filename');

      const api = ast.moduleBody.nodes[0];
      return api.apiBody;
    }

    expect(() => {
      returns('');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. Expect {, but EOF`);
    });

    expect(() => {
      returns('{');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. expect valid expression`);
    });

    expect(() => {
      returns('{}');
    }).to.not.throwException();
  });

  it('stmts should ok', function () {
    function stmts(value) {
      var ast = parse(`
        api id(): string {
          method = "GET";
          pathname = "/";
        } returns {
          ${value}
        }
      `, '__filename');

      const api = ast.moduleBody.nodes[0];
      return api.returns;
    }

    expect(() => {
      stmts('...');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: .. expect valid expression`);
    });

    expect(() => {
      stmts('id');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ;, but }`);
    });

    expect(() => {
      stmts('id = ');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. expect valid expression`);
    });

    expect(() => {
      stmts('id = "string"');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ;, but }`);
    });

    expect(stmts('id = "string";')).to.eql({
      'stmts': {
        'stmts': [
          {
            'expr': {
              'type': 'string',
              'value': {
                'index': 21,
                'string': 'string',
                'tag': 1,
                loc: loc(6, 17, 6, 23)
              },
              'tokenRange': [21, 22],
              loc: loc(6, 17, 6, 23)
            },
            left: {
              type: 'variable',
              id: {
                'index': 19,
                'lexeme': 'id',
                'tag': 2,
                loc: loc(6, 11, 6, 13)
              }
            },
            'tokenRange': [19, 22],
            'type': 'assign'
          }
        ],
        'tokenRange': [18, 23],
        'type': 'stmts'
      },
      'loc': loc(5, 19, 8, 7),
      'tokenRange': [18, 23],
      'type': 'returnBody'
    });

    expect(stmts('id.value = "string";')).to.eql({
      'stmts': {
        'stmts': [
          {
            'expr': {
              'type': 'string',
              'value': {
                'index': 23,
                'string': 'string',
                'tag': 1,
                loc: loc(6, 23, 6, 29)
              },
              'tokenRange': [23, 24],
              loc: loc(6, 23, 6, 29)
            },
            left: {
              type: 'property',
              'id': {
                'lexeme': 'id',
                'index': 19,
                'tag': 2,
                loc: loc(6, 11, 6, 13)
              },
              'propertyPath': [
                {
                  'index': 21,
                  'lexeme': 'value',
                  'tag': 2,
                  loc: loc(6, 14, 6, 19)
                }
              ]
            },
            'tokenRange': [19, 24],
            'type': 'assign'
          }
        ],
        'tokenRange': [18, 25],
        'type': 'stmts'
      },
      'tokenRange': [18, 25],
      loc: loc(5, 19, 8, 7),
      'type': 'returnBody'
    });

    expect(() => {
      stmts('var');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ID, but }`);
    });

    expect(() => {
      stmts('var id');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect =, but }`);
    });

    expect(() => {
      stmts('var id = ');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. expect valid expression`);
    });

    expect(() => {
      stmts('var id = "string"');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ;, but }`);
    });

    expect(stmts('var id = "string";')).to.eql({
      'stmts': {
        'stmts': [
          {
            'expr': {
              'type': 'string',
              'value': {
                'index': 22,
                'string': 'string',
                'tag': 1,
                loc: loc(6, 21, 6, 27)
              },
              'tokenRange': [22, 23],
              loc: loc(6, 21, 6, 27)
            },
            expectedType: undefined,
            'id': {
              'index': 20,
              'lexeme': 'id',
              'tag': 2,
              loc: loc(6, 15, 6, 17)
            },
            'tokenRange': [19, 23],
            'type': 'declare'
          }
        ],
        'tokenRange': [18, 24],
        'type': 'stmts'
      },
      'tokenRange': [18, 24],
      loc: loc(5, 19, 8, 7),
      'type': 'returnBody'
    });

    expect(() => {
      stmts('return');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. expect valid expression`);
    });

    expect(() => {
      stmts('return "string"');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ;, but }`);
    });

    expect(stmts('return "string";')).to.eql({
      'stmts': {
        'stmts': [
          {
            'expr': {
              'type': 'string',
              'value': {
                'index': 20,
                'string': 'string',
                'tag': 1,
                loc: loc(6, 19, 6, 25)
              },
              'tokenRange': [20, 21],
              loc: loc(6, 19, 6, 25)
            },
            'tokenRange': [19, 21],
            'type': 'return',
            'loc': loc(6, 11, 7, 9)
          }
        ],
        'tokenRange': [18, 22],
        'type': 'stmts'
      },
      'tokenRange': [18, 22],
      loc: loc(5, 19, 8, 7),
      'type': 'returnBody'
    });

    expect(() => {
      stmts('retry');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ;, but }`);
    });

    expect(stmts('retry;')).to.eql({
      'stmts': {
        'stmts': [
          {
            'tokenRange': [19, 20],
            'type': 'retry',
            'loc': loc(6, 11, 6, 16)
          }
        ],
        'tokenRange': [18, 21],
        'type': 'stmts'
      },
      'tokenRange': [18, 21],
      loc: loc(5, 19, 8, 7),
      'type': 'returnBody'
    });

    expect(stmts(`
      retry;
      retry;
    `)).to.eql({
      'stmts': {
        'stmts': [
          {
            'tokenRange': [19, 20],
            'type': 'retry',
            'loc': loc(7, 7, 7, 12)
          },
          {
            'tokenRange': [21, 22],
            'type': 'retry',
            'loc': loc(8, 7, 8, 12)
          }
        ],
        'tokenRange': [18, 23],
        'type': 'stmts'
      },
      'tokenRange': [18, 23],
      loc: loc(5, 19, 11, 7),
      'type': 'returnBody'
    });

    expect(() => {
      stmts('throw');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect {, but }`);
    });

    expect(() => {
      stmts('throw {');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. expect valid expression`);
    });

    expect(stmts('throw {}')).to.eql({
      'stmts': {
        'stmts': [
          {
            'expr': {
              'fields': [],
              'type': 'object',
              'tokenRange': [20, 21],
              loc: loc(6, 17, 7, 9)
            },
            'tokenRange': [19, 21],
            'type': 'throw'
          }
        ],
        'tokenRange': [18, 22],
        'type': 'stmts'
      },
      'tokenRange': [18, 22],
      loc: loc(5, 19, 8, 7),
      'type': 'returnBody'
    });

    expect(stmts('throw {};')).to.eql({
      'stmts': {
        'stmts': [
          {
            'expr': {
              'fields': [],
              'type': 'object',
              'tokenRange': [20, 21],
              loc: loc(6, 17, 6, 19)
            },
            'tokenRange': [19, 22],
            'type': 'throw'
          }
        ],
        'tokenRange': [18, 23],
        'type': 'stmts'
      },
      'tokenRange': [18, 23],
      loc: loc(5, 19, 8, 7),
      'type': 'returnBody'
    });

    expect(() => {
      stmts('if');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect (, but }`);
    });

    expect(() => {
      stmts('if (');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. expect valid expression`);
    });

    expect(() => {
      stmts('if (id');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ), but }`);
    });

    expect(() => {
      stmts('if (id) ');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect {, but }`);
    });

    expect(() => {
      stmts('if (id) {');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. expect valid expression`);
    });

    expect(stmts(`if (id) {
        retry;
      }`)).to.eql({
      'stmts': {
        'stmts': [
          {
            'condition': {
              'id': {
                'index': 21,
                'lexeme': 'id',
                'tag': 2,
                loc: loc(6, 15, 6, 17)
              },
              'tokenRange': [21, 22],
              loc: loc(6, 15, 6, 17),
              'type': 'variable'
            },
            'elseIfs': [],
            'elseStmts': undefined,
            'stmts': {
              'stmts': [
                {
                  'tokenRange': [24, 25],
                  'type': 'retry',
                  'loc': loc(7, 9, 7, 14)
                }
              ],
              'tokenRange': [23, 26],
              'type': 'stmts'
            },
            'tokenRange': [19, 26],
            'type': 'if'
          }
        ],
        'tokenRange': [18, 27],
        'type': 'stmts'
      },
      'tokenRange': [18, 27],
      loc: loc(5, 19, 10, 7),
      'type': 'returnBody'
    });

    expect(() => {
      stmts(`if (id) {
        retry;
      } else`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. expect "if" or "{"`);
    });

    expect(() => {
      stmts(`if (id) {
        retry;
      } else if`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect (, but }`);
    });

    expect(() => {
      stmts(`if (id) {
        retry;
      } else if (`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. expect valid expression`);
    });

    expect(() => {
      stmts(`if (id) {
        retry;
      } else if (id2`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ), but }`);
    });

    expect(() => {
      stmts(`if (id) {
        retry;
      } else if (id2)`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect {, but }`);
    });

    expect(() => {
      stmts(`if (id) {
        retry;
      } else if (id2) {`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. expect valid expression`);
    });

    expect(() => {
      stmts(`if (id) {
        retry;
      } else if (id2) {
        retry;`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. expect valid expression`);
    });

    expect(stmts(`if (id) {
        retry;
      } else if (id2) {
        retry;
      }`)).to.eql({
      'stmts': {
        'stmts': [
          {
            'condition': {
              'id': {
                'index': 21,
                'lexeme': 'id',
                'tag': 2,
                loc: loc(6, 15, 6, 17)
              },
              'tokenRange': [21, 22],
              loc: loc(6, 15, 6, 17),
              'type': 'variable'
            },
            'elseIfs': [
              {
                'condition': {
                  'id': {
                    'index': 30,
                    'lexeme': 'id2',
                    'tag': 2,
                    loc: loc(8, 18, 8, 21)
                  },
                  loc: loc(8, 18, 8, 21),
                  'tokenRange': [30, 31],
                  'type': 'variable'
                },
                'stmts': {
                  'stmts': [
                    {
                      'tokenRange': [33, 34],
                      'type': 'retry',
                      'loc': loc(9, 9, 9, 14)
                    }
                  ],
                  'tokenRange': [32, 35],
                  'type': 'stmts'
                },
                'type': 'elseif'
              }
            ],
            'elseStmts': undefined,
            'stmts': {
              'stmts': [
                {
                  'type': 'retry',
                  'tokenRange': [24, 25],
                  'loc': loc(7, 9, 7, 14)
                }
              ],
              'tokenRange': [23, 26],
              'type': 'stmts'
            },
            'tokenRange': [19, 35],
            'type': 'if'
          }
        ],
        'tokenRange': [18, 36],
        'type': 'stmts'
      },
      'tokenRange': [18, 36],
      loc: loc(5, 19, 12, 7),
      'type': 'returnBody'
    });

    expect(() => {
      stmts(`if (id) {
        retry;
      } else {`);
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: EOF. expect valid expression`);
    });

    expect(stmts(`if (id) {
        retry;
      } else {
        retry;
      }`)).to.eql({
      'stmts': {
        'stmts': [
          {
            'condition': {
              'id': {
                'index': 21,
                'lexeme': 'id',
                'tag': 2,
                loc: loc(6, 15, 6, 17)
              },
              loc: loc(6, 15, 6, 17),
              'tokenRange': [21, 22],
              'type': 'variable'
            },
            'elseIfs': [],
            'elseStmts': {
              'stmts': [
                {
                  'type': 'retry',
                  'tokenRange': [29, 30],
                  'loc': loc(9, 9, 9, 14)
                }
              ],
              'tokenRange': [28, 31],
              'type': 'stmts'
            },
            'stmts': {
              'stmts': [
                {
                  'tokenRange': [24, 25],
                  'type': 'retry',
                  'loc': loc(7, 9, 7, 14)
                }
              ],
              'tokenRange': [23, 26],
              'type': 'stmts'
            },
            'tokenRange': [19, 31],
            'type': 'if'
          }
        ],
        'tokenRange': [18, 32],
        'type': 'stmts'
      },
      'tokenRange': [18, 32],
      loc: loc(5, 19, 12, 7),
      'type': 'returnBody'
    });

    expect(stmts(`if (id) {
        retry;
      } else if (id2) {
        retry;
      } else {
        retry;
      }`)).to.eql({
      'stmts': {
        'stmts': [
          {
            'condition': {
              'id': {
                'index': 21,
                'lexeme': 'id',
                'tag': 2,
                loc: loc(6, 15, 6, 17)
              },
              'tokenRange': [21, 22],
              loc: loc(6, 15, 6, 17),
              'type': 'variable'
            },
            'elseIfs': [
              {
                'condition': {
                  'id': {
                    'index': 30,
                    'lexeme': 'id2',
                    'tag': 2,
                    loc: loc(8, 18, 8, 21)
                  },
                  loc: loc(8, 18, 8, 21),
                  'tokenRange': [30, 31],
                  'type': 'variable'
                },
                'stmts': {
                  'stmts': [
                    {
                      'tokenRange': [33, 34],
                      'type': 'retry',
                      'loc': loc(9, 9, 9, 14)
                    }
                  ],
                  'tokenRange': [32, 35],
                  'type': 'stmts'
                },
                'type': 'elseif'
              }
            ],
            'elseStmts': {
              'stmts': [
                {
                  'tokenRange': [38, 39],
                  'type': 'retry',
                  'loc': loc(11, 9, 11, 14)
                }
              ],
              'tokenRange': [37, 40],
              'type': 'stmts'
            },
            'stmts': {
              'stmts': [
                {
                  'type': 'retry',
                  'tokenRange': [24, 25],
                  'loc': loc(7, 9, 7, 14)
                }
              ],
              'tokenRange': [23, 26],
              'type': 'stmts'
            },
            'tokenRange': [19, 40],
            'type': 'if'
          }
        ],
        'tokenRange': [18, 41],
        'type': 'stmts'
      },
      loc: loc(5, 19, 14, 7),
      'tokenRange': [18, 41],
      'type': 'returnBody'
    });
  });

  it('expr should ok', function () {
    function expr(value) {
      var ast = parse(`
        api id(): string {
          method = "GET";
          pathname = "/";
        } returns {
          id = ${value};
        }
      `, '__filename');

      const api = ast.moduleBody.nodes[0];
      return api.returns.stmts.stmts[0].expr;
    }

    expect(() => {
      expr('');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: ;. expect valid expression`);
    });

    expect(expr('id2')).to.eql({
      'id': {
        'index': 21,
        'lexeme': 'id2',
        'tag': 2,
        loc: loc(6, 16, 6, 19)
      },
      'tokenRange': [21, 22],
      loc: loc(6, 16, 6, 19),
      'type': 'variable'
    });

    expect(expr('id2.xprop')).to.eql({
      'id': {
        'index': 21,
        'lexeme': 'id2',
        'tag': 2,
        loc: loc(6, 16, 6, 19)
      },
      'loc': loc(6, 16, 6, 25),
      'propertyPath': [
        {
          'index': 23,
          'lexeme': 'xprop',
          'tag': 2,
          loc: loc(6, 20, 6, 25)
        }
      ],
      'tokenRange': [21, 24],
      'type': 'property_access'
    });

    expect(expr('@vid')).to.eql({
      'type': 'virtualVariable',
      'tokenRange': [21, 22],
      'vid': {
        'index': 21,
        'lexeme': '@vid',
        'tag': 3,
        loc: loc(6, 16, 6, 20)
      },
      'loc': loc(6, 16, 6, 20)
    });

    expect(expr('@vid.x')).to.eql({
      'id': {
        'index': 21,
        'lexeme': '@vid',
        'tag': 3,
        loc: loc(6, 16, 6, 20)
      },
      'tokenRange': [21, 24],
      'type': 'property_access',
      'loc': loc(6, 16, 6, 22),
      'propertyPath': [
        {
          'index': 23,
          'lexeme': 'x',
          'loc': loc(6, 21, 6, 22),
          'tag': 2
        }
      ]
    });

    expect(expr('@vid.x()')).to.eql({
      'type': 'call',
      'tokenRange': [21, 26],
      'loc': loc(6, 16, 6, 24),
      'left': {
        'id': {
          'index': 21,
          'lexeme': '@vid',
          'tag': 3,
          loc: loc(6, 16, 6, 20)
        },
        'propertyPath': [
          {
            'index': 23,
            'lexeme': 'x',
            'loc': loc(6, 21, 6, 22),
            'tag': 2
          }
        ],
        'type': 'static_or_instance_call'
      },
      'args': []
    });

    expect(expr('@vid.x = 1')).to.eql({
      'expr': {
        'loc': loc(6, 25, 6, 26),
        'tokenRange': [25, 26],
        'type': 'number',
        'value': {
          'index': 25,
          'value': 1,
          'type': 'integer',
          'tag': 9,
          loc: loc(6, 25, 6, 26)
        },
      },
      'left': {
        'id': {
          'index': 21,
          'lexeme': '@vid',
          'tag': 3,
          loc: loc(6, 16, 6, 20)
        },
        'propertyPath': [
          {
            'index': 23,
            'lexeme': 'x',
            'loc': loc(6, 21, 6, 22),
            'tag': 2
          }
        ],
        'type': 'property'
      },
      'tokenRange': [21, 26],
      'type': 'assign'
    });

    expect(expr('`abcdefg`')).to.eql({
      'elements': [
        {
          'type': 'element',
          'value': {
            'index': 21,
            'string': 'abcdefg',
            'tag': 12,
            'tail': true,
            loc: loc(6, 17, 6, 24)
          }
        }
      ],
      'tokenRange': [21, 22],
      'type': 'template_string'
    });

    expect(expr('`abc${"abc"}defg`')).to.eql({
      'elements': [
        {
          'type': 'element',
          'value': {
            'index': 21,
            'string': 'abc',
            'tag': 12,
            'tail': false,
            loc: loc(6, 17, 6, 20)
          }
        },
        {
          'expr': {
            'type': 'string',
            'value': {
              'index': 22,
              'string': 'abc',
              'tag': 1,
              loc: loc(6, 23, 6, 26)
            },
            loc: loc(6, 23, 6, 26),
            'tokenRange': [22, 23],
          },
          'type': 'expr'
        },
        {
          'type': 'element',
          'value': {
            'index': 23,
            'string': 'defg',
            'tag': 12,
            'tail': true,
            loc: loc(6, 28, 6, 32)
          }
        }
      ],
      'tokenRange': [21, 24],
      'type': 'template_string'
    });

    expect(expr('`abc${"abc"}d${"e"}fg`')).to.eql({
      'elements': [
        {
          'type': 'element',
          'value': {
            'index': 21,
            'string': 'abc',
            'tag': 12,
            'tail': false,
            loc: loc(6, 17, 6, 20)
          }
        },
        {
          'expr': {
            'type': 'string',
            'value': {
              'index': 22,
              'string': 'abc',
              'tag': 1,
              loc: loc(6, 23, 6, 26)
            },
            'tokenRange': [22, 23],
            loc: loc(6, 23, 6, 26)
          },
          'type': 'expr'
        },
        {
          'type': 'element',
          'value': {
            'index': 23,
            'string': 'd',
            'tag': 12,
            'tail': false,
            loc: loc(6, 28, 6, 29)
          }
        },
        {
          'expr': {
            'type': 'string',
            'value': {
              'index': 24,
              'string': 'e',
              'tag': 1,
              loc: loc(6, 32, 6, 33)
            },
            'tokenRange': [24, 25],
            loc: loc(6, 32, 6, 33)
          },
          'type': 'expr'
        },
        {
          'type': 'element',
          'value': {
            'index': 25,
            'string': 'fg',
            'tag': 12,
            'tail': true,
            loc: loc(6, 35, 6, 37)
          }
        }
      ],
      'tokenRange': [21, 26],
      'type': 'template_string'
    });

    expect(expr('{}')).to.eql({
      'fields': [],
      'type': 'object',
      'tokenRange': [21, 23],
      loc: loc(6, 16, 6, 18)
    });

    expect(expr('{a = 1}')).to.eql({
      'fields': [
        {
          'expr': {
            'type': 'number',
            'value': {
              'index': 24,
              'tag': 9,
              'value': 1,
              'type': 'integer',
              loc: loc(6, 21, 6, 22)
            },
            'tokenRange': [24, 25],
            loc: loc(6, 21, 6, 22)
          },
          'fieldName': {
            'index': 22,
            'lexeme': 'a',
            'tag': 2,
            loc: loc(6, 17, 6, 18)
          },
          'tokenRange': [22, 25],
          'type': 'objectField'
        }
      ],
      'type': 'object',
      'tokenRange': [21, 26],
      loc: loc(6, 16, 6, 23)
    });

    expect(expr('{a = 1,}')).to.eql({
      'fields': [
        {
          'expr': {
            'type': 'number',
            'tokenRange': [24, 25],
            'value': {
              'index': 24,
              'tag': 9,
              'value': 1,
              'type': 'integer',
              loc: loc(6, 21, 6, 22)
            },
            loc: loc(6, 21, 6, 22)
          },
          'fieldName': {
            'index': 22,
            'lexeme': 'a',
            'tag': 2,
            loc: loc(6, 17, 6, 18)
          },
          'tokenRange': [22, 25],
          'type': 'objectField'
        }
      ],
      'type': 'object',
      'tokenRange': [21, 27],
      loc: loc(6, 16, 6, 24)
    });

    expect(expr('{a = 1, b = 2L, c = 1.2}')).to.eql({
      'fields': [
        {
          'expr': {
            'type': 'number',
            'value': {
              'index': 24,
              'tag': 9,
              'type': 'integer',
              'value': 1,
              loc: loc(6, 21, 6, 22)
            },
            'tokenRange': [24, 25],
            loc: loc(6, 21, 6, 22)
          },
          'fieldName': {
            'index': 22,
            'lexeme': 'a',
            'tag': 2,
            loc: loc(6, 17, 6, 18)
          },
          'tokenRange': [22, 25],
          'type': 'objectField'
        },
        {
          'expr': {
            'type': 'number',
            'value': {
              'index': 28,
              'tag': 9,
              'type': 'long',
              'value': 2,
              loc: loc(6, 28, 6, 30)
            },
            'tokenRange': [28, 29],
            loc: loc(6, 28, 6, 30)
          },
          'fieldName': {
            'index': 26,
            'lexeme': 'b',
            'tag': 2,
            loc: loc(6, 24, 6, 25)
          },
          'tokenRange': [26, 29],
          'type': 'objectField'
        },
        {
          'expr': {
            'type': 'number',
            'value': {
              'index': 32,
              'tag': 9,
              'type': 'float',
              'value': 1.2,
              loc: loc(6, 36, 6, 39)
            },
            'tokenRange': [32, 33],
            loc: loc(6, 36, 6, 39)
          },
          'fieldName': {
            'index': 30,
            'lexeme': 'c',
            'tag': 2,
            loc: loc(6, 32, 6, 33)
          },
          'tokenRange': [30, 33],
          'type': 'objectField'
        }
      ],
      'tokenRange': [21, 34],
      'type': 'object',
      loc: loc(6, 16, 6, 40)
    });

    expect(expr('{a = 1, b = 2, c = 1.2d, d = 1.2f,}')).to.eql({
      'fields': [
        {
          'expr': {
            'type': 'number',
            'value': {
              'index': 24,
              'tag': 9,
              'type': 'integer',
              'value': 1,
              loc: loc(6, 21, 6, 22)
            },
            'tokenRange': [24, 25],
            loc: loc(6, 21, 6, 22)
          },
          'fieldName': {
            'index': 22,
            'lexeme': 'a',
            'tag': 2,
            loc: loc(6, 17, 6, 18)
          },
          'tokenRange': [22, 25],
          'type': 'objectField'
        },
        {
          'expr': {
            'type': 'number',
            'value': {
              'index': 28,
              'tag': 9,
              'value': 2,
              'type': 'integer',
              loc: loc(6, 28, 6, 29)
            },
            'tokenRange': [28, 29],
            loc: loc(6, 28, 6, 29)
          },
          'fieldName': {
            'index': 26,
            'lexeme': 'b',
            'tag': 2,
            loc: loc(6, 24, 6, 25)
          },
          'tokenRange': [26, 29],
          'type': 'objectField'
        },
        {
          'expr': {
            'type': 'number',
            'value': {
              'index': 32,
              'tag': 9,
              'value': 1.2,
              'type': 'double',
              loc: loc(6, 35, 6, 39)
            },
            'tokenRange': [32, 33],
            loc: loc(6, 35, 6, 39)
          },
          'fieldName': {
            'index': 30,
            'lexeme': 'c',
            'tag': 2,
            loc: loc(6, 31, 6, 32)
          },
          'tokenRange': [30, 33],
          'type': 'objectField'
        },
        {
          'expr': {
            'type': 'number',
            'value': {
              'index': 36,
              'tag': 9,
              'value': 1.2,
              'type': 'float',
              loc: loc(6, 45, 6, 49)
            },
            'tokenRange': [36, 37],
            loc: loc(6, 45, 6, 49)
          },
          'fieldName': {
            'index': 34,
            'lexeme': 'd',
            'tag': 2,
            loc: loc(6, 41, 6, 42)
          },
          'tokenRange': [34, 37],
          'type': 'objectField'
        }
      ],
      'tokenRange': [21, 39],
      'type': 'object',
      loc: loc(6, 16, 6, 51)
    });

    expect(() => {
      expr('{a = 1, b = 2.}');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: .. expect ","`);
    });

    expect(() => {
      expr('{.}');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ., but }`);
    });

    expect(() => {
      expr('{..}');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. Expect ., but }`);
    });

    expect(() => {
      expr('{...}');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. expect valid expression`);
    });

    expect(() => {
      expr('{*}}');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: *. expect "..." or ID`);
    });

    expect(expr('{...a}')).to.eql({
      'fields': [
        {
          'expr': {
            'id': {
              'index': 25,
              'lexeme': 'a',
              'tag': 2,
              loc: loc(6, 20, 6, 21)
            },
            'tokenRange': [25, 26],
            loc: loc(6, 20, 6, 21),
            'type': 'variable'
          },
          'tokenRange': [22, 26],
          'type': 'expandField'
        }
      ],
      'tokenRange': [21, 27],
      'type': 'object',
      loc: loc(6, 16, 6, 22)
    });

    expect(() => {
      expr('[1 1]');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: Number: 1. expect ","`);
    });

    expect(expr('[]')).to.eql({
      'items': [],
      'tokenRange': [21, 23],
      'type': 'array'
    });
  });

  it('global annotation should be ok', function () {
    var ast = parse(`
    /**
     * global annotation
     */
  `, '__filename');

    expect(ast).to.eql({
      'type': 'module',
      'extends': undefined,
      'imports': [],
      'moduleBody': {
        'nodes': [],
        'type': 'moduleBody'
      },
      'comments': {},
      'annotation': {
        'index': 1,
        loc: loc(2, 5, 4, 8),
        tag: 19,
        value: '/**\n     * global annotation\n     */'
      }
    });
  });

  it('function annotation should be ok', function () {
    var ast = parse(`
    /**
     * global annotation
     */
    /**
     * description
     * @param key key description
     * @return returns value
     */
    static function hello(key: string): string;
  `, '__filename');
    const [fun] = ast.moduleBody.nodes;
    expect(fun.annotation).to.eql({
      'index': 2,
      loc: loc(5, 5, 9, 8),
      tag: 19,
      value: '/**\n     * description\n     * @param key key description\n     * @return returns value\n     */'
    });
  });

  it('only api/function/const/model should be ok', function () {
    expect(function () {
      parse(`
        public
      `, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('Unexpected token: Word: `public`. expect "const", "type", "model", "function", "init" or "api"');
    });
  });

  it('runtime should ok', function () {
    var ast = parse(`
      api id(settings: object): string {
        __request.method = 'GET';
        __request.pathname = '/';
      } runtime {
        ignoreSSL = false,
        timeout = {
          value = 3000,
          timeouted = 'retry'
        },
        retry = {
          retryable = true,
          policy = 'simple',
          max-retry = settings.max-attempts
        },
        backoff = {
          policy= 'no'
        }
      }
    `, '__filename');

    const api = ast.moduleBody.nodes[0];

    expect(api).to.eql({
      'annotation': undefined,
      'apiBody': {
        'type': 'apiBody',
        'tokenRange': [10, 23],
        'stmts': {
          'type': 'stmts',
          'tokenRange': [10, 23],
          'stmts': [
            {
              'expr': {
                'loc': {
                  'end': {
                    'column': 32,
                    'line': 3
                  },
                  'start': {
                    'column': 29,
                    'line': 3
                  },
                },
                'tokenRange': [15, 16],
                'type': 'string',
                'value': {
                  'index': 15,
                  'loc': {
                    'end': {
                      'column': 32,
                      'line': 3
                    },
                    'start': {
                      'column': 29,
                      'line': 3
                    }
                  },
                  'string': 'GET',
                  'tag': 1
                }
              },
              'left': {
                'id': {
                  'index': 11,
                  'lexeme': '__request',
                  'loc': loc(3, 9, 3, 18),
                  'tag': 2
                },
                'propertyPath': [
                  {
                    'index': 13,
                    'lexeme': 'method',
                    'tag': 2,
                    loc: loc(3, 19, 3, 25)
                  }
                ],
                'type': 'property',
              },
              'tokenRange': [11, 16],
              'type': 'assign'
            },
            {
              'expr': {
                'tokenRange': [21, 22],
                'type': 'string',
                loc: loc(4, 31, 4, 32),
                'value': {
                  'index': 21,
                  'loc': loc(4, 31, 4, 32),
                  'tag': 1,
                  'string': '/'
                },
              },
              'left': {
                'id': {
                  'index': 17,
                  'lexeme': '__request',
                  'loc': loc(4, 9, 4, 18),
                  'tag': 2
                },
                'propertyPath': [
                  {
                    'index': 19,
                    lexeme: 'pathname',
                    'loc': loc(4, 19, 4, 27),
                    'tag': 2
                  }
                ],
                'type': 'property',
              },
              'tokenRange': [17, 22],
              'type': 'assign'
            }
          ]
        }
      },
      'apiName': {
        'index': 2,
        'lexeme': 'id',
        'tag': 2,
        loc: loc(2, 11, 2, 13)
      },
      'params': {
        'params': [
          {
            'defaultValue': null,
            'paramName': {
              'index': 4,
              'lexeme': 'settings',
              'tag': 2,
              loc: loc(2, 14, 2, 22)
            },
            'paramType': {
              'index': 6,
              'lexeme': 'object',
              'loc': loc(2, 24, 2, 30),
              'tag': 8
            },
            'type': 'param'
          }
        ],
        'type': 'params'
      },
      'returnType': {
        'index': 9,
        'lexeme': 'string',
        'tag': 8,
        loc: loc(2, 33, 2, 39)
      },
      'returns': undefined,
      'runtimeBody': {
        'fields': [
          {
            'expr': {
              'type': 'boolean',
              'tokenRange': [28, 29],
              'value': false,
              loc: loc(6, 21, 6, 26)
            },
            'fieldName': {
              'index': 26,
              'lexeme': 'ignoreSSL',
              'tag': 2,
              loc: loc(6, 9, 6, 18)
            },
            'tokenRange': [26, 29],
            'type': 'objectField'
          },
          {
            'expr': {
              'fields': [
                {
                  'expr': {
                    'type': 'number',
                    'tokenRange': [35, 36],
                    'value': {
                      'index': 35,
                      'tag': 9,
                      'value': 3000,
                      'type': 'integer',
                      loc: loc(8, 19, 8, 23)
                    },
                    loc: loc(8, 19, 8, 23)
                  },
                  'fieldName': {
                    'index': 33,
                    'lexeme': 'value',
                    'tag': 2,
                    loc: loc(8, 11, 8, 16)
                  },
                  'tokenRange': [33, 36],
                  'type': 'objectField'
                },
                {
                  'expr': {
                    'type': 'string',
                    'value': {
                      'index': 39,
                      'string': 'retry',
                      'tag': 1,
                      loc: loc(9, 24, 9, 29)
                    },
                    'tokenRange': [39, 40],
                    loc: loc(9, 24, 9, 29)
                  },
                  'fieldName': {
                    'index': 37,
                    'lexeme': 'timeouted',
                    'tag': 2,
                    loc: loc(9, 11, 9, 20)
                  },
                  'tokenRange': [37, 40],
                  'type': 'objectField'
                }
              ],
              loc: loc(7, 19, 10, 10),
              'tokenRange': [32, 41],
              'type': 'object'
            },
            'fieldName': {
              'index': 30,
              'lexeme': 'timeout',
              'tag': 2,
              loc: loc(7, 9, 7, 16)
            },
            'tokenRange': [30, 41],
            'type': 'objectField'
          },
          {
            'expr': {
              'fields': [
                {
                  'expr': {
                    'type': 'boolean',
                    'tokenRange': [47, 48],
                    'value': true,
                    loc: loc(12, 23, 12, 27)
                  },
                  'fieldName': {
                    'index': 45,
                    'lexeme': 'retryable',
                    'tag': 2,
                    loc: loc(12, 11, 12, 20)
                  },
                  'tokenRange': [45, 48],
                  'type': 'objectField'
                },
                {
                  'expr': {
                    'type': 'string',
                    'tokenRange': [51, 52],
                    'value': {
                      'index': 51,
                      'string': 'simple',
                      'tag': 1,
                      loc: loc(13, 21, 13, 27)
                    },
                    loc: loc(13, 21, 13, 27)
                  },
                  'fieldName': {
                    'index': 49,
                    'lexeme': 'policy',
                    'tag': 2,
                    loc: loc(13, 11, 13, 17)
                  },
                  'tokenRange': [49, 52],
                  'type': 'objectField'
                },
                {
                  'expr': {
                    'id': {
                      'index': 55,
                      'lexeme': 'settings',
                      'tag': 2,
                      loc: loc(14, 23, 14, 31)
                    },
                    'propertyPath': [
                      {
                        'index': 57,
                        'lexeme': 'max-attempts',
                        'tag': 2,
                        loc: loc(14, 32, 14, 44)
                      }
                    ],
                    loc: loc(14, 23, 15, 9),
                    'tokenRange': [55, 58],
                    'type': 'property_access'
                  },
                  'fieldName': {
                    'index': 53,
                    'lexeme': 'max-retry',
                    'tag': 2,
                    loc: loc(14, 11, 14, 20)
                  },
                  'tokenRange': [53, 58],
                  'type': 'objectField'
                }
              ],
              'tokenRange': [44, 59],
              'type': 'object',
              loc: loc(11, 17, 15, 10)
            },
            'fieldName': {
              'index': 42,
              'lexeme': 'retry',
              'tag': 2,
              loc: loc(11, 9, 11, 14)
            },
            'tokenRange': [42, 59],
            'type': 'objectField'
          },
          {
            'expr': {
              'fields': [
                {
                  'expr': {
                    'type': 'string',
                    'tokenRange': [65, 66],
                    'value': {
                      'index': 65,
                      'string': 'no',
                      'tag': 1,
                      loc: loc(17, 20, 17, 22)
                    },
                    loc: loc(17, 20, 17, 22)
                  },
                  'fieldName': {
                    'index': 63,
                    'lexeme': 'policy',
                    'tag': 2,
                    loc: loc(17, 11, 17, 17)
                  },
                  'tokenRange': [63, 66],
                  'type': 'objectField'
                }
              ],
              'tokenRange': [62, 67],
              'type': 'object',
              loc: loc(16, 19, 19, 7)
            },
            'fieldName': {
              'index': 60,
              'lexeme': 'backoff',
              'tag': 2,
              loc: loc(16, 9, 16, 16)
            },
            'tokenRange': [60, 67],
            'type': 'objectField'
          }
        ],
        'tokenRange': [25, 67],
        'type': 'object',
        loc: loc(5, 17, 20, 5)
      },
      'tokenRange': [1, 67],
      'type': 'api'
    });
  });

  it('function should ok', function () {
    var ast = parse(`
      api id(): string {
        __request.method = 'GET';
        __request.pathname = '/';
      }

      function callId(): string {
        return id();
      }

      function callId2(): void {
        return id();
      }
    `, '__filename');

    const [api, wrap, wrap2] = ast.moduleBody.nodes;

    expect(api).to.eql({
      'annotation': undefined,
      'apiBody': {
        'stmts': {
          'stmts': [
            {
              'expr': {
                'type': 'string',
                'tokenRange': [12, 13],
                'value': {
                  'index': 12,
                  'string': 'GET',
                  'tag': 1,
                  loc: loc(3, 29, 3, 32)
                },
                loc: loc(3, 29, 3, 32)
              },
              'left': {
                'id': {
                  'index': 8,
                  'lexeme': '__request',
                  'tag': 2,
                  loc: loc(3, 9, 3, 18)
                },
                'type': 'property',
                'propertyPath': [
                  {
                    'index': 10,
                    'lexeme': 'method',
                    'loc': {
                      'end': {
                        'column': 25,
                        'line': 3
                      },
                      'start': {
                        'column': 19,
                        'line': 3
                      }
                    },
                    'tag': 2
                  }
                ]
              },
              'tokenRange': [8, 13],
              'type': 'assign'
            },
            {
              'expr': {
                'type': 'string',
                'value': {
                  'index': 18,
                  'string': '/',
                  'tag': 1,
                  loc: loc(4, 31, 4, 32)
                },
                'tokenRange': [18, 19],
                loc: loc(4, 31, 4, 32)
              },
              'left': {
                'id': {
                  'index': 14,
                  'lexeme': '__request',
                  'tag': 2,
                  loc: loc(4, 9, 4, 18)
                },
                'propertyPath': [
                  {
                    'index': 16,
                    'lexeme': 'pathname',
                    'loc': loc(4, 19, 4, 27),
                    'tag': 2
                  }
                ],
                'type': 'property'
              },
              'tokenRange': [14, 19],
              'type': 'assign'
            },
          ],
          'tokenRange': [7, 20],
          'type': 'stmts'
        },
        'tokenRange': [7, 20],
        'type': 'apiBody'
      },
      'apiName': {
        'index': 2,
        'lexeme': 'id',
        'tag': 2,
        loc: loc(2, 11, 2, 13)
      },
      'params': {
        'params': [],
        'type': 'params'
      },
      'returnType': {
        'index': 6,
        'lexeme': 'string',
        'loc': loc(2, 17, 2, 23),
        'tag': 8
      },
      'returns': undefined,
      'runtimeBody': undefined,
      'tokenRange': [1, 20],
      'type': 'api'
    });

    expect(wrap).to.eql({
      'annotation': undefined,
      'isStatic': false,
      'isAsync': false,
      'hasThrow': false,
      'functionBody': {
        'type': 'functionBody',
        'tokenRange': [27, 33],
        'stmts': {
          'stmts': [
            {
              'expr': {
                'args': [],
                left: {
                  'type': 'method_call',
                  'id': {
                    'index': 29,
                    'lexeme': 'id',
                    'loc': loc(8, 16, 8, 18),
                    'tag': 2
                  },
                },
                'tokenRange': [29, 32],
                'type': 'call',
                'loc': loc(8, 16, 8, 20)
              },
              'tokenRange': [28, 32],
              'type': 'return',
              'loc': loc(8, 9, 9, 7)
            }
          ],
          'tokenRange': [27, 33],
          'type': 'stmts'
        },
        loc: loc(7, 33, 11, 15)
      },
      'functionName': {
        'index': 22,
        'lexeme': 'callId',
        'tag': 2,
        loc: loc(7, 16, 7, 22)
      },
      'params': {
        'params': [],
        'type': 'params'
      },
      'returnType': {
        'index': 26,
        'lexeme': 'string',
        'tag': 8,
        loc: loc(7, 26, 7, 32)
      },
      'tokenRange': [21, 33],
      'type': 'function'
    });

    expect(wrap2).to.eql({
      'annotation': undefined,
      'isStatic': false,
      'isAsync': false,
      'hasThrow': false,
      'functionBody': {
        'type': 'functionBody',
        'tokenRange': [40, 46],
        loc: loc(11, 32, 14, 5),
        'stmts': {
          'stmts': [
            {
              'expr': {
                'args': [],
                left: {
                  'id': {
                    'index': 42,
                    'lexeme': 'id',
                    'loc': loc(12, 16, 12, 18),
                    'tag': 2
                  },
                  'type': 'method_call'
                },
                'tokenRange': [42, 45],
                'type': 'call',
                'loc': loc(12, 16, 12, 20)
              },
              'tokenRange': [41, 45],
              'type': 'return',
              'loc': loc(12, 9, 13, 7)
            }
          ],
          'tokenRange': [40, 46],
          'type': 'stmts'
        }
      },
      'functionName': {
        'index': 35,
        'lexeme': 'callId2',
        'tag': 2,
        loc: loc(11, 16, 11, 23)
      },
      'params': {
        'params': [],
        'type': 'params'
      },
      'returnType': {
        'index': 39,
        'lexeme': 'void',
        'loc': loc(11, 27, 11, 31),
        'tag': 8
      },
      'tokenRange': [34, 46],
      'type': 'function'
    });
  });

  it('function with throws should ok', function () {
    var ast = parse(`
      function callId() throws : string;
      function callId2(): string;
      `, '__filename');

    const [func, func2] = ast.moduleBody.nodes;

    expect(func.hasThrow).to.be(true);
    expect(func2.hasThrow).to.be(false);
  });

  it('function should ok without body', function () {
    var ast = parse(`
        function callId(): string;
        function callId2(): string
      `, '__filename');

    const [func1, func2] = ast.moduleBody.nodes;

    expect(func1).to.eql({
      'annotation': undefined,
      'isStatic': false,
      'isAsync': false,
      'hasThrow': false,
      'params': {
        'params': [],
        'type': 'params'
      },
      'returnType': {
        'index': 6,
        'lexeme': 'string',
        'loc': loc(2, 28, 2, 34),
        'tag': 8
      },
      'tokenRange': [1, 7],
      'type': 'function',
      'functionBody': null,
      'functionName': {
        'index': 2,
        'lexeme': 'callId',
        'loc': loc(2, 18, 2, 24),
        'tag': 2
      }
    });
    expect(func2).to.eql({
      'annotation': undefined,
      'isStatic': false,
      'isAsync': false,
      'hasThrow': false,
      'params': {
        'params': [],
        'type': 'params'
      },
      'returnType': {
        'index': 13,
        'lexeme': 'string',
        'loc': loc(3, 29, 3, 35),
        'tag': 8
      },
      'tokenRange': [8, 14],
      'type': 'function',
      'functionBody': null,
      'functionName': {
        'index': 9,
        'lexeme': 'callId2',
        'loc': loc(3, 18, 3, 25),
        'tag': 2
      }
    });
  });

  it('map[string]string should ok', function () {
    var ast = parse(`
      model mymodel = {
        key: map[string][string]
      }
    `, '__filename');

    const [model] = ast.moduleBody.nodes;

    expect(model.type).to.be('model');
    const [field] = model.modelBody.nodes;
    expect(field).to.eql({
      'attrs': [],
      'fieldName': {
        'index': 5,
        'lexeme': 'key',
        'loc': {
          'end': {
            'column': 12,
            'line': 3
          },
          'start': {
            'column': 9,
            'line': 3
          },
        },
        'tag': 2
      },
      'fieldValue': {
        'fieldType': 'map',
        'keyType': {
          'index': 9,
          'lexeme': 'string',
          'loc': {
            'end': {
              'column': 24,
              'line': 3
            },
            'start': {
              'column': 18,
              'line': 3
            },
          },
          'tag': 8,
        },
        'type': 'fieldType',
        'valueType': {
          'subType': {
            'index': 12,
            'lexeme': 'string',
            'loc': loc(3, 26, 3, 32),
            'tag': 8
          },
          'type': 'array',
        },
      },
      'required': true,
      'tokenRange': [5, 14],
      'type': 'modelField'
    });
  });

  it('map[string]moduleModel should ok', function(){
    var ast = parse(`
      import oss;

      model A {
        B: map[string]oss.C
      }
    `, '__filename');
    const [model] = ast.moduleBody.nodes;
    expect(model.type).to.be('model');
    expect(model.modelBody.nodes[0].fieldValue.valueType).to.be.eql({
      'type': 'subModel_or_moduleModel',
      'path': [
        {
          'tag': 2,
          'loc': {
            'start': {
              'line': 5,
              'column': 23
            },
            'end': {
              'line': 5,
              'column': 26
            }
          },
          'lexeme': 'oss',
          'index': 13
        },
        {
          'tag': 2,
          'loc': {
            'start': {
              'line': 5,
              'column': 27
            },
            'end': {
              'line': 5,
              'column': 28
            }
          },
          'lexeme': 'C',
          'index': 15
        }
      ],
      'loc': {
        'start': {
          'line': 5,
          'column': 23
        },
        'end': {
          'line': 5,
          'column': 28
        }
      }
    });

    ast = parse(`
      import oss;

      init(){
        var test: map[string] oss.C = {};
      }
    `, '__filename');
    const [init] = ast.moduleBody.nodes;
    expect(init.initBody.stmts[0].expectedType).to.be.eql({
      'loc': {
        'start': {
          'line': 5,
          'column': 19
        },
        'end': {
          'line': 5,
          'column': 36
        }
      },
      'type': 'map',
      'keyType': {
        'tag': 8,
        'loc': {
          'start': {
            'line': 5,
            'column': 23
          },
          'end': {
            'line': 5,
            'column': 29
          }
        },
        'lexeme': 'string',
        'index': 13
      },
      'valueType': {
        'type': 'subModel_or_moduleModel',
        'path': [
          {
            'tag': 2,
            'loc': {
              'start': {
                'line': 5,
                'column': 31
              },
              'end': {
                'line': 5,
                'column': 34
              }
            },
            'lexeme': 'oss',
            'index': 15
          },
          {
            'tag': 2,
            'loc': {
              'start': {
                'line': 5,
                'column': 35
              },
              'end': {
                'line': 5,
                'column': 36
              }
            },
            'lexeme': 'C',
            'index': 17
          }
        ],
        'loc': {
          'start': {
            'line': 5,
            'column': 31
          },
          'end': {
            'line': 5,
            'column': 36
          }
        }
      }
    });
  });

  it('import should ok', function () {
    var ast = parse(`import oss

`, '__filename');
    expect(ast.imports).to.eql([
      {
        'index': 2,
        'lexeme': 'oss',
        'tokenRange': [1, 2],
        'loc': loc(1, 8, 1, 11),
        'tag': 2
      }
    ]);
  });

  it('import with comma should ok', function () {
    var ast = parse(`import oss;

`, '__filename');
    expect(ast.imports).to.eql([
      {
        'index': 2,
        'lexeme': 'oss',
        'loc': loc(1, 8, 1, 11),
        'tag': 2,
        'tokenRange': [1, 3],
      }
    ]);
  });

  it('init should ok', function () {
    var ast = parse(`
  init();
`, '__filename');
    const [init] = ast.moduleBody.nodes;
    expect(init.type).to.be('init');
    expect(init.params).to.eql({
      'params': [],
      'type': 'params'
    });
  });

  it('init without comma should ok', function () {
    var ast = parse(`
  init()
`, '__filename');
    const [init] = ast.moduleBody.nodes;
    expect(init.type).to.be('init');
    expect(init.params).to.eql({
      'params': [],
      'type': 'params'
    });
  });

  it('init(config) should ok', function () {
    var ast = parse(`
  model Config = {
    AK: string
  };

  init(config: Config);
`, '__filename');
    const [model, init] = ast.moduleBody.nodes;
    expect(model.type).to.be('model');
    expect(model.modelName).to.eql({
      'index': 2,
      'lexeme': 'Config',
      'loc': loc(2, 9, 2, 15),
      'tag': 2
    });
    expect(init.type).to.be('init');
    expect(init.params).to.eql({
      'params': [
        {
          'defaultValue': null,
          'paramName': {
            'index': 12,
            'lexeme': 'config',
            'loc': loc(6, 8, 6, 14),
            'tag': 2
          },
          'paramType': {
            'index': 14,
            'lexeme': 'Config',
            'loc': loc(6, 16, 6, 22),
            'tag': 2,
          },
          'type': 'param'
        }
      ],
      'type': 'params'
    });
  });

  it('import/new instance should ok', function () {
    var ast = parse(`import oss


  function callOSS(): string {
    var client = new oss();
    client.putObject();
    return "OK";
  }

`, '__filename');

    const [fun] = ast.moduleBody.nodes;
    expect(fun.type).to.be('function');
    expect(fun.functionName).to.eql({
      'index': 4,
      'lexeme': 'callOSS',
      'loc': loc(4, 12, 4, 19),
      'tag': 2
    });
    expect(fun.functionBody).to.be.ok();
    expect(fun.functionBody.stmts.stmts).to.eql([
      {
        'expr': {
          'aliasId': {
            'index': 14,
            'lexeme': 'oss',
            'loc': loc(5, 22, 5, 25),
            'tag': 2
          },
          'args': [],
          'tokenRange': [13, 17],
          'type': 'construct'
        },
        'id': {
          'index': 11,
          'lexeme': 'client',
          'loc': loc(5, 9, 5, 15),
          'tag': 2
        },
        expectedType: undefined,
        'tokenRange': [10, 17],
        'type': 'declare'
      },
      {
        'args': [],
        left: {
          'type': 'static_or_instance_call',
          'id': {
            'index': 18,
            'lexeme': 'client',
            'loc': loc(6, 5, 6, 11),
            'tag': 2
          },
          'propertyPath': [
            {
              'index': 20,
              'lexeme': 'putObject',
              'loc': loc(6, 12, 6, 21),
              'tag': 2
            }
          ],
        },
        loc: loc(6, 5, 6, 23),
        'tokenRange': [18, 23],
        'type': 'call'
      },
      {
        'expr': {
          'type': 'string',
          'tokenRange': [25, 26],
          'value': {
            'index': 25,
            'loc': loc(7, 13, 7, 15),
            'string': 'OK',
            'tag': 1
          },
          'loc': loc(7, 13, 7, 15)
        },
        'tokenRange': [24, 26],
        'type': 'return',
        'loc': loc(7, 5, 8, 3)
      }
    ]);
  });

  it('new extern model should ok', function () {
    var ast = parse(`import oss


  function callOSS(): string {
    var config = new oss.Config;
    return "OK";
  }

`, '__filename');

    const [fun] = ast.moduleBody.nodes;
    expect(fun.type).to.be('function');
    expect(fun.functionName).to.eql({
      'index': 4,
      'lexeme': 'callOSS',
      'loc': loc(4, 12, 4, 19),
      'tag': 2
    });
    expect(fun.functionBody).to.be.ok();
    expect(fun.functionBody.stmts.stmts).to.eql([
      {
        'expr': {
          'aliasId': {
            'index': 14,
            'lexeme': 'oss',
            'loc': loc(5, 22, 5, 25),
            'tag': 2
          },
          'propertyPath': [
            {
              'index': 16,
              'lexeme': 'Config',
              'loc': loc(5, 26, 5, 32),
              'tag': 2
            }
          ],
          'object': null,
          'tokenRange': [13, 17],
          'type': 'construct_model'
        },
        'id': {
          'index': 11,
          'lexeme': 'config',
          'loc': loc(5, 9, 5, 15),
          'tag': 2
        },
        expectedType: undefined,
        'tokenRange': [10, 17],
        'type': 'declare'
      },
      {
        'expr': {
          'type': 'string',
          'tokenRange': [19, 20],
          'value': {
            'index': 19,
            'loc': loc(6, 13, 6, 15),
            'string': 'OK',
            'tag': 1
          },
          'loc': loc(6, 13, 6, 15)
        },
        'tokenRange': [18, 20],
        'type': 'return',
        'loc': loc(6, 5, 7, 3)
      }
    ]);
  });

  it('new extern model with literal should ok', function () {
    var ast = parse(`import oss


  function callOSS(): string {
    var config = new oss.Config{
      accessKeyId = "ak",
    };
    return "OK";
  }

`, '__filename');

    const [fun] = ast.moduleBody.nodes;
    expect(fun.type).to.be('function');
    expect(fun.functionName).to.eql({
      'index': 4,
      'lexeme': 'callOSS',
      'loc': loc(4, 12, 4, 19),
      'tag': 2
    });
    expect(fun.functionBody).to.be.ok();
    expect(fun.functionBody.stmts.stmts).to.eql([
      {
        'expr': {
          'aliasId': {
            'index': 14,
            'lexeme': 'oss',
            'loc': loc(5, 22, 5, 25),
            'tag': 2
          },
          propertyPath: [
            {
              'index': 16,
              'lexeme': 'Config',
              'loc': loc(5, 26, 5, 32),
              'tag': 2
            }
          ],
          'object': {
            'fields': [
              {
                'expr': string('ak', 6, 22, 6, 24, 20, 20, 21),
                'fieldName': {
                  'index': 18,
                  'lexeme': 'accessKeyId',
                  'loc': loc(6, 7, 6, 18),
                  'tag': 2
                },
                'tokenRange': [18, 21],
                'type': 'objectField'
              }
            ],
            'tokenRange': [17, 22],
            'type': 'object',
            loc: loc(5, 32, 7, 6)
          },
          'tokenRange': [13, 23],
          'type': 'construct_model'
        },
        'id': {
          'index': 11,
          'lexeme': 'config',
          'loc': loc(5, 9, 5, 15),
          'tag': 2
        },
        expectedType: undefined,
        'tokenRange': [10, 23],
        'type': 'declare'
      },
      {
        'expr': string('OK', 8, 13, 8, 15, 25, 25, 26),
        'type': 'return',
        'tokenRange': [24, 26],
        'loc': loc(8, 5, 9, 3)
      }
    ]);
  });

  it('module call in expr should ok', function () {
    var ast = parse(`import oss

  function callOSS(): string {
    var client = new oss();
    var result = client.putObject();
    return "OK";
  }
`, '__filename');

    const [fun] = ast.moduleBody.nodes;
    expect(fun.type).to.be('function');
    expect(fun.functionName).to.eql({
      'index': 4,
      'lexeme': 'callOSS',
      'loc': loc(3, 12, 3, 19),
      'tag': 2
    });
    expect(fun.functionBody).to.be.ok();
    expect(fun.functionBody.stmts.stmts).to.eql([
      {
        'expr': {
          'aliasId': {
            'index': 14,
            'lexeme': 'oss',
            'loc': loc(4, 22, 4, 25),
            'tag': 2
          },
          'args': [],
          'tokenRange': [13, 17],
          'type': 'construct'
        },
        'id': {
          'index': 11,
          'lexeme': 'client',
          'loc': loc(4, 9, 4, 15),
          'tag': 2
        },
        expectedType: undefined,
        'tokenRange': [10, 17],
        'type': 'declare'
      },
      {
        'expr': {
          'args': [],
          left: {
            type: 'static_or_instance_call',
            id: {
              'index': 21,
              'lexeme': 'client',
              'loc': loc(5, 18, 5, 24),
              'tag': 2
            },
            'propertyPath': [
              {
                'index': 23,
                'lexeme': 'putObject',
                'loc': loc(5, 25, 5, 34),
                'tag': 2
              }
            ],
          },
          'tokenRange': [21, 26],
          'type': 'call',
          'loc': loc(5, 18, 5, 36)
        },
        'id': {
          'index': 19,
          'lexeme': 'result',
          'loc': loc(5, 9, 5, 15),
          'tag': 2
        },
        expectedType: undefined,
        'tokenRange': [18, 26],
        'type': 'declare'
      },
      {
        'expr': string('OK', 6, 13, 6, 15, 28, 28, 29),
        'tokenRange': [27, 29],
        'type': 'return',
        'loc': loc(6, 5, 7, 3)
      }
    ]);
  });

  it('rpc() should ok', function () {
    var ast = parse(`import oss
    

      rpc rpcName(): string {

      }

    `, '__filename');
    const [rpc] = ast.moduleBody.nodes;
    expect(rpc.type).to.be('rpc');
    expect(rpc.rpcName).to.eql({
      'index': 4,
      'lexeme': 'rpcName',
      'loc': loc(4, 11, 4, 18),
      'tag': 2
    });
  });

  it('declare in Request block should ok', function () {
    var ast = parse(`
      api apiName(): string {
        var id = "random_id";
      }
    `, '__filename');
    const [api] = ast.moduleBody.nodes;
    expect(api.type).to.be('api');
    expect(api.apiBody.stmts.stmts).to.eql([
      {
        'expr': string('random_id', 3, 19, 3, 28, 11, 11, 12),
        'id': {
          'index': 9,
          'lexeme': 'id',
          'loc': loc(3, 13, 3, 15),
          'tag': 2
        },
        expectedType: undefined,
        'tokenRange': [8, 12],
        'type': 'declare'
      }
    ]);
  });

  it('declare with expected type should ok', function () {
    var ast = parse(`

      function func(): void  {
        var a : string = "";
      }
    `, '__filename');
    const [func] = ast.moduleBody.nodes;
    expect(func.type).to.be('function');
    expect(func.functionBody.stmts.stmts).to.eql([
      {
        'type': 'declare',
        'tokenRange': [8, 14],
        'id': {
          'index': 9,
          'lexeme': 'a',
          loc: loc(4, 13, 4, 14),
          'tag': 2
        },
        'expectedType': {
          'index': 11,
          'lexeme': 'string',
          loc: loc(4, 17, 4, 23),
          'tag': 8
        },
        'expr': {
          'loc': loc(4, 27, 4, 27),
          'type': 'string',
          'tokenRange': [13, 14],
          'value': {
            'index': 13,
            'loc': loc(4, 27, 4, 27),
            'string': '',
            'tag': 1
          }
        }
      }
    ]);
  });

  it('static should ok', function () {
    var ast = parse(`
    
      static function equal(actual: any, expected: any, message: string): void {
      }
    `, '__filename');
    const [fun] = ast.moduleBody.nodes;
    expect(fun.type).to.be('function');
    expect(fun.isStatic).to.be(true);
  });

  it('async function should ok', function () {
    var ast = parse(`
    
      async function equal(actual: any, expected: any, message: string): void {
      }
    `, '__filename');
    const [fun] = ast.moduleBody.nodes;
    expect(fun.type).to.be('function');
    expect(fun.isAsync).to.be(true);
  });

  it('null should ok', function () {
    var ast = parse(`
    
      function equal(): any {
        return null;
      }
    `, '__filename');
    const [fun] = ast.moduleBody.nodes;
    expect(fun).to.eql({
      'annotation': undefined,
      'isStatic': false,
      'isAsync': false,
      'hasThrow': false,
      'params': {
        'params': [],
        'type': 'params'
      },
      'returnType': {
        'index': 6,
        'lexeme': 'any',
        'loc': loc(3, 25, 3, 28),
        'tag': 8
      },
      'tokenRange': [1, 11],
      'type': 'function',
      'functionBody': {
        'loc': loc(3, 29, 6, 5),
        'stmts': {
          'stmts': [
            {
              'expr': {
                'tokenRange': [9, 10],
                'type': 'null'
              },
              'tokenRange': [8, 10],
              'type': 'return',
              'loc': loc(4, 9, 5, 7)
            }
          ],
          'tokenRange': [7, 11],
          'type': 'stmts'
        },
        'tokenRange': [7, 11],
        'type': 'functionBody'
      },
      'functionName': {
        'index': 2,
        'lexeme': 'equal',
        'loc': loc(3, 16, 3, 21),
        'tag': 2
      }
    });
  });

  it('subModel type should ok', function () {
    var ast = parse(`
      import oss

      model A {
        B: {
          str: string
        }
      }

      function equal(): A.B {

      }
    `, '__filename');
    const [, fun] = ast.moduleBody.nodes;
    expect(fun.type).to.be('function');
    expect(fun.returnType).to.be.eql({
      type: 'subModel_or_moduleModel',
      loc: {
        start: { line: 10, column: 25 },
        end: { line: 10, column: 28 }
      },
      path: [
        {
          tag: 2,
          loc: loc(10, 25, 10, 26),
          index: 19,
          lexeme: 'A'
        },
        {
          tag: 2,
          loc: loc(10, 27, 10, 28),
          index: 21,
          lexeme: 'B'
        }
      ]
    });
  });

  it('return void should ok', function () {
    var ast = parse(`
    
      static function equal(actual: any, expected: any, message: string): void {
        return;
      }
    `, '__filename');
    const [fun] = ast.moduleBody.nodes;
    expect(fun.type).to.be('function');
    expect(fun.isStatic).to.be(true);
    const [returnExpr] = fun.functionBody.stmts.stmts;
    expect(returnExpr).to.eql({
      'loc': loc(4, 9, 5, 7),
      'tokenRange': [20, 21],
      'type': 'return'
    });
  });

  it('if stmt in request block should ok', function () {
    var ast = parse(`
      import Util
      api set_password(request: DefaultSetPasswordRequest): void  {
        __request.method = 'POST';
        __request.pathname = '/';
        if (Util.notEmpty(@accessToken)) {
          __request.headers.authorization = \`Bearer \${@accessToken}\`;
        }
      }
    `, '__filename');
    const [api] = ast.moduleBody.nodes;
    expect(api.type).to.be('api');
    expect(api.apiBody.type).to.be('apiBody');
    const [, , ifBlock] = api.apiBody.stmts.stmts;
    expect(ifBlock).to.eql({
      'condition': {
        'left': {
          'id': {
            'index': 27,
            'lexeme': 'Util',
            'loc': loc(6, 13, 6, 17),
            'tag': 2
          },
          'propertyPath': [
            {
              'index': 29,
              'lexeme': 'notEmpty',
              'loc': loc(6, 18, 6, 26),
              'tag': 2
            }
          ],
          'type': 'static_or_instance_call'
        },
        'args': [
          {
            'type': 'virtualVariable',
            'vid': {
              'index': 31,
              'lexeme': '@accessToken',
              'loc': loc(6, 27, 6, 39),
              'tag': 3
            },
            'tokenRange': [31, 32],
            'loc': loc(6, 27, 6, 39),
          }
        ],
        'loc': loc(6, 13, 6, 40),
        'tokenRange': [27, 33],
        'type': 'call'
      },
      'elseIfs': [],
      'elseStmts': undefined,
      'stmts': {
        'stmts': [
          {
            'expr': {
              'elements': [
                {
                  'type': 'element',
                  'value': {
                    'index': 41,
                    'loc': loc(7, 46, 7, 53),
                    'string': 'Bearer ',
                    'tag': 12,
                    'tail': false
                  }
                },
                {
                  'expr': {
                    'type': 'virtualVariable',
                    'tokenRange': [42, 43],
                    'vid': {
                      'index': 42,
                      'lexeme': '@accessToken',
                      'loc': loc(7, 55, 7, 67),
                      'tag': 3
                    },
                    'loc': loc(7, 55, 7, 67),
                  },
                  'type': 'expr'
                },
                {
                  'type': 'element',
                  'value': {
                    'index': 43,
                    'loc': loc(7, 68, 7, 68),
                    'string': '',
                    'tag': 12,
                    'tail': true
                  }
                }
              ],
              'tokenRange': [41, 44],
              'type': 'template_string'
            },
            'left': {
              'id': {
                'index': 35,
                'lexeme': '__request',
                'loc': loc(7, 11, 7, 20),
                'tag': 2
              },
              'propertyPath': [
                {
                  'index': 37,
                  'lexeme': 'headers',
                  'loc': loc(7, 21, 7, 28),
                  'tag': 2
                },
                {
                  'index': 39,
                  'lexeme': 'authorization',
                  'loc': loc(7, 29, 7, 42),
                  'tag': 2
                }
              ],
              'type': 'property'
            },
            'tokenRange': [35, 44],
            'type': 'assign'
          }
        ],
        'tokenRange': [34, 45],
        'type': 'stmts'
      },
      'tokenRange': [25, 45],
      'type': 'if'
    });
  });

  it('if/elseif stmt in request block should ok', function () {
    var ast = parse(`
      import Util
      api set_password(request: DefaultSetPasswordRequest): void  {
        __request.method = 'POST';
        __request.pathname = '/';
        if (Util.notEmpty(@accessToken)) {
          __request.headers.authorization = \`Bearer \${@accessToken}\`;
        } else if (Util.notEmpty(@accessKeyId)) {
          __request.headers.authorization = \`Bearer \${@accessToken}\`;
        }
      }
    `, '__filename');
    const [api] = ast.moduleBody.nodes;
    expect(api.type).to.be('api');
    expect(api.apiBody.type).to.be('apiBody');
    const [, , ifBlock] = api.apiBody.stmts.stmts;
    expect(ifBlock).to.eql({
      'condition': {
        'args': [
          {
            'type': 'virtualVariable',
            'tokenRange': [31, 32],
            'vid': {
              'index': 31,
              'lexeme': '@accessToken',
              'loc': loc(6, 27, 6, 39),
              'tag': 3
            },
            'loc': loc(6, 27, 6, 39),
          }
        ],
        'left': {
          'id': {
            'index': 27,
            'lexeme': 'Util',
            'loc': loc(6, 13, 6, 17),
            'tag': 2
          },
          'propertyPath': [
            {
              'index': 29,
              'lexeme': 'notEmpty',
              loc: loc(6, 18, 6, 26),
              'tag': 2
            }
          ],
          'type': 'static_or_instance_call'
        },
        'loc': loc(6, 13, 6, 40),
        'tokenRange': [27, 33],
        'type': 'call'
      },
      'elseIfs': [
        {
          'condition': {
            'args': [
              {
                'type': 'virtualVariable',
                'tokenRange': [53, 54],
                'vid': {
                  'index': 53,
                  'lexeme': '@accessKeyId',
                  loc: loc(8, 34, 8, 46),
                  'tag': 3
                },
                loc: loc(8, 34, 8, 46),
              }
            ],
            loc: loc(8, 20, 8, 47),
            'left': {
              'id': {
                'index': 49,
                'lexeme': 'Util',
                'loc': loc(8, 20, 8, 24),
                'tag': 2
              },
              'propertyPath': [
                {
                  'index': 51,
                  'lexeme': 'notEmpty',
                  'loc': loc(8, 25, 8, 33),
                  'tag': 2
                }
              ],
              'type': 'static_or_instance_call'
            },
            'tokenRange': [49, 55],
            'type': 'call',
          },
          'stmts': {
            'stmts': [
              {
                'expr': {
                  'elements': [
                    {
                      'type': 'element',
                      'value': {
                        'index': 63,
                        'loc': loc(9, 46, 9, 53),
                        'string': 'Bearer ',
                        'tag': 12,
                        'tail': false
                      }
                    },
                    {
                      'expr': {
                        'loc': loc(9, 55, 9, 67),
                        'tokenRange': [64, 65],
                        'type': 'virtualVariable',
                        'vid': {
                          'index': 64,
                          'lexeme': '@accessToken',
                          'loc': loc(9, 55, 9, 67),
                          'tag': 3
                        }
                      },
                      'type': 'expr'
                    },
                    {
                      'type': 'element',
                      'value': {
                        'index': 65,
                        'loc': loc(9, 68, 9, 68),
                        'string': '',
                        'tag': 12,
                        'tail': true
                      }
                    }
                  ],
                  'tokenRange': [63, 66],
                  'type': 'template_string'
                },
                'left': {
                  'id': {
                    'index': 57,
                    'lexeme': '__request',
                    'loc': loc(9, 11, 9, 20),
                    'tag': 2
                  },
                  'propertyPath': [
                    {
                      'index': 59,
                      'lexeme': 'headers',
                      loc: loc(9, 21, 9, 28),
                      'tag': 2
                    },
                    {
                      'index': 61,
                      'lexeme': 'authorization',
                      'loc': loc(9, 29, 9, 42),
                      'tag': 2
                    }
                  ],
                  'type': 'property'
                },
                'tokenRange': [57, 66],
                'type': 'assign'
              }
            ],
            'tokenRange': [56, 67],
            'type': 'stmts'
          },
          'type': 'elseif'
        }
      ],
      'elseStmts': undefined,
      'stmts': {
        'stmts': [
          {
            'expr': {
              'elements': [
                {
                  'type': 'element',
                  'value': {
                    'index': 41,
                    loc: loc(7, 46, 7, 53),
                    'string': 'Bearer ',
                    'tag': 12,
                    'tail': false
                  }
                },
                {
                  'expr': {
                    'type': 'virtualVariable',
                    'tokenRange': [42, 43],
                    'vid': {
                      'index': 42,
                      'lexeme': '@accessToken',
                      loc: loc(7, 55, 7, 67),
                      'tag': 3
                    },
                    loc: loc(7, 55, 7, 67),
                  },
                  'type': 'expr'
                },
                {
                  'type': 'element',
                  'value': {
                    'index': 43,
                    loc: loc(7, 68, 7, 68),
                    'string': '',
                    'tag': 12,
                    'tail': true
                  }
                }
              ],
              'tokenRange': [41, 44],
              'type': 'template_string'
            },
            'left': {
              'id': {
                'index': 35,
                'lexeme': '__request',
                loc: loc(7, 11, 7, 20),
                'tag': 2
              },
              'propertyPath': [
                {
                  'index': 37,
                  'lexeme': 'headers',
                  loc: loc(7, 21, 7, 28),
                  'tag': 2
                },
                {
                  'index': 39,
                  'lexeme': 'authorization',
                  loc: loc(7, 29, 7, 42),
                  'tag': 2
                }
              ],
              'type': 'property'
            },
            'tokenRange': [35, 44],
            'type': 'assign'
          }
        ],
        'tokenRange': [34, 45],
        'type': 'stmts'
      },
      'tokenRange': [25, 67],
      'type': 'if'
    });
  });

  it('only if or { should be after else', function () {
    expect(function () {
      parse(`
        import Util
        api set_password(request: DefaultSetPasswordRequest): void  {
          method = 'POST';
          pathname = '/';
          if (Util.notEmpty(@accessToken)) {
            headers.authorization = \`Bearer \${@accessToken}\`;
          } else x {
            headers.authorization = \`Bearer \${@accessToken}\`;
          }
        }
      `, '__filename');
    }).to.throwException((ex) => {
      expect(ex).to.be.an(SyntaxError);
      expect(ex.message).to.be('Unexpected token: Word: `x`. expect "if" or "{"');
    });
  });

  it('assign should ok', function () {
    var ast = parse(`
      function func(): void  {
        @id = "string";
      }
    `, '__filename');
    const [func] = ast.moduleBody.nodes;
    expect(func.type).to.be('function');
    expect(func).to.eql({
      'annotation': undefined,
      'isAsync': false,
      'isStatic': false,
      'hasThrow': false,
      'params': {
        'params': [],
        'type': 'params'
      },
      'returnType': {
        'index': 6,
        'lexeme': 'void',
        loc: loc(2, 24, 2, 28),
        'tag': 8
      },
      'type': 'function',
      'tokenRange': [1, 12],
      'functionBody': {
        loc: loc(2, 30, 5, 5),
        'stmts': {
          'stmts': [
            {
              'expr': string('string', 3, 16, 3, 22, 10, 10, 11),
              left: {
                type: 'virtualVariable',
                'vid': {
                  'index': 8,
                  'lexeme': '@id',
                  loc: loc(3, 9, 3, 12),
                  'tag': 3
                },
              },
              loc: loc(3, 9, 3, 23),
              'tokenRange': [8, 11],
              'type': 'assign'
            }
          ],
          'tokenRange': [7, 12],
          'type': 'stmts'
        },
        'tokenRange': [7, 12],
        'type': 'functionBody'
      },
      'functionName': {
        'index': 2,
        'lexeme': 'func',
        loc: loc(2, 16, 2, 20),
        'tag': 2
      }
    });
  });

  it('try/catch should ok', function () {
    var ast = parse(`

      import Util

      function func(): void  {
        try {
          Util.print("try block");
        } catch (ex) {
          Util.print(\`error message: \${ex.message}\`);
        }
      }
    `, '__filename');
    const [func] = ast.moduleBody.nodes;
    expect(func.type).to.be('function');
    expect(func.functionBody.stmts.stmts).to.eql([
      {
        'type': 'try',
        'tryBlock': {
          'stmts': [
            {
              'args': [
                string('try block', 7, 23, 7, 32, 16, 16, 17)
              ],
              'left': {
                'id': {
                  'index': 12,
                  'lexeme': 'Util',
                  'loc': loc(7, 11, 7, 15),
                  'tag': 2
                },
                'propertyPath': [
                  {
                    'index': 14,
                    'lexeme': 'print',
                    loc: loc(7, 16, 7, 21),
                    'tag': 2
                  }
                ],
                'type': 'static_or_instance_call'
              },
              loc: loc(7, 11, 7, 34),
              'tokenRange': [12, 18],
              'type': 'call',
            }
          ],
          'tokenRange': [11, 19],
          'type': 'stmts'
        },
        'catchId': {
          'index': 22,
          'lexeme': 'ex',
          loc: loc(8, 18, 8, 20),
          'tag': 2
        },
        'catchBlock': {
          stmts: [
            {
              'args': [
                {
                  'elements': [
                    {
                      'type': 'element',
                      'value': {
                        'index': 29,
                        loc: loc(9, 23, 9, 38),
                        'string': 'error message: ',
                        'tag': 12,
                        'tail': false
                      }
                    },
                    {
                      'expr': {
                        'id': {
                          'index': 30,
                          'lexeme': 'ex',
                          loc: loc(9, 40, 9, 42),
                          'tag': 2
                        },
                        'propertyPath': [
                          {
                            'index': 32,
                            'lexeme': 'message',
                            loc: loc(9, 43, 9, 50),
                            'tag': 2
                          }
                        ],
                        loc: loc(9, 40, 9, 52),
                        'tokenRange': [30, 33],
                        'type': 'property_access'
                      },
                      'type': 'expr'
                    },
                    {
                      'type': 'element',
                      'value': {
                        'index': 33,
                        loc: loc(9, 51, 9, 51),
                        'string': '',
                        'tag': 12,
                        'tail': true
                      }
                    }
                  ],
                  'tokenRange': [29, 34],
                  'type': 'template_string'
                }
              ],
              'left': {
                'id': {
                  'index': 25,
                  'lexeme': 'Util',
                  'loc': loc(9, 11, 9, 15),
                  'tag': 2
                },
                'propertyPath': [
                  {
                    'index': 27,
                    'lexeme': 'print',
                    loc: loc(9, 16, 9, 21),
                    'tag': 2
                  }
                ],
                'type': 'static_or_instance_call'
              },
              loc: loc(9, 11, 9, 53),
              'tokenRange': [25, 35],
              'type': 'call',
            }
          ],
          'tokenRange': [24, 36],
          'type': 'stmts'
        },
        'tokenRange': [10, 36],
        finallyBlock: null
      }
    ]);
  });

  it('try/catch/finally should ok', function () {
    var ast = parse(`
    
      import Util

      function func(): void  {
        try {
          Util.print("try block");
        } catch (ex) {
          Util.print(\`error message: \${ex.message}\`);
        } finally {
          Util.print("finally block");
        }
      }
    `, '__filename');
    let [func] = ast.moduleBody.nodes;
    expect(func.type).to.be('function');
    expect(func.functionBody.stmts.stmts).to.eql([
      {
        'type': 'try',
        'tokenRange': [10, 46],
        'tryBlock': {
          'stmts': [
            {
              'args': [
                string('try block', 7, 23, 7, 32, 16, 16, 17)
              ],
              loc: loc(7, 11, 7, 34),
              'type': 'call',
              'tokenRange': [12, 18],
              'left': {
                'id': {
                  'index': 12,
                  'lexeme': 'Util',
                  'loc': loc(7, 11, 7, 15),
                  'tag': 2
                },
                'propertyPath': [
                  {
                    'index': 14,
                    'lexeme': 'print',
                    'loc': loc(7, 16, 7, 21),
                    'tag': 2
                  }
                ],
                'type': 'static_or_instance_call'
              }
            }
          ],
          'tokenRange': [11, 19],
          'type': 'stmts'
        },
        'catchId': {
          'index': 22,
          'lexeme': 'ex',
          loc: loc(8, 18, 8, 20),
          'tag': 2
        },
        'catchBlock': {
          stmts: [
            {
              'args': [
                {
                  'elements': [
                    {
                      'type': 'element',
                      'value': {
                        'index': 29,
                        loc: loc(9, 23, 9, 38),
                        'string': 'error message: ',
                        'tag': 12,
                        'tail': false
                      }
                    },
                    {
                      'expr': {
                        'id': {
                          'index': 30,
                          'lexeme': 'ex',
                          loc: loc(9, 40, 9, 42),
                          'tag': 2
                        },
                        'propertyPath': [
                          {
                            'index': 32,
                            'lexeme': 'message',
                            loc: loc(9, 43, 9, 50),
                            'tag': 2
                          }
                        ],
                        loc: loc(9, 40, 9, 52),
                        'tokenRange': [30, 33],
                        'type': 'property_access'
                      },
                      'type': 'expr'
                    },
                    {
                      'type': 'element',
                      'value': {
                        'index': 33,
                        loc: loc(9, 51, 9, 51),
                        'string': '',
                        'tag': 12,
                        'tail': true
                      }
                    }
                  ],
                  'tokenRange': [29, 34],
                  'type': 'template_string'
                }
              ],
              loc: loc(9, 11, 9, 53),
              'type': 'call',
              'tokenRange': [25, 35],
              'left': {
                'id': {
                  'index': 25,
                  'lexeme': 'Util',
                  'loc': loc(9, 11, 9, 15),
                  'tag': 2
                },
                'propertyPath': [
                  {
                    'index': 27,
                    'lexeme': 'print',
                    'loc': loc(9, 16, 9, 21),
                    'tag': 2
                  }
                ],
                'type': 'static_or_instance_call'
              }
            }
          ],
          'tokenRange': [24, 36],
          'type': 'stmts'
        },
        'finallyBlock': {
          'stmts': [
            {
              'args': [
                string('finally block', 11, 23, 11, 36, 43, 43, 44)
              ],
              loc: loc(11, 11, 11, 38),
              'type': 'call',
              'tokenRange': [39, 45],
              'left': {
                'id': {
                  'index': 39,
                  'lexeme': 'Util',
                  'loc': loc(11, 11, 11, 15),
                  'tag': 2
                },
                'propertyPath': [
                  {
                    'index': 41,
                    'lexeme': 'print',
                    'loc': loc(11, 16, 11, 21),
                    'tag': 2
                  }
                ],
                'type': 'static_or_instance_call'
              }
            }
          ],
          'tokenRange': [38, 46],
          'type': 'stmts'
        }
      }
    ]);
    ast = parse(`
    
      import Util

      function func(): void  {
        try {
          Util.print("try block");
        } finally {
          Util.print("finally block");
        }
      }
    `, '__filename');

    ast = parse(`
    
      import Util

      function func(): void  {
        try {
          Util.print("try block");
        } catch (ex) {
          Util.print(\`error message: \${ex.message}\`);
        }
      }
    `, '__filename');
    [ func ] = ast.moduleBody.nodes;
    expect(func.type).to.be('function');
    expect(func.functionBody.stmts.stmts).to.eql([
      {
        'type': 'try',
        'tokenRange': [10, 36],
        'tryBlock': {
          'stmts': [
            {
              'args': [
                string('try block', 7, 23, 7, 32, 16, 16, 17)
              ],
              loc: loc(7, 11, 7, 34),
              'type': 'call',
              'tokenRange': [12, 18],
              'left': {
                'id': {
                  'index': 12,
                  'lexeme': 'Util',
                  'loc': loc(7, 11, 7, 15),
                  'tag': 2
                },
                'propertyPath': [
                  {
                    'index': 14,
                    'lexeme': 'print',
                    'loc': loc(7, 16, 7, 21),
                    'tag': 2
                  }
                ],
                'type': 'static_or_instance_call'
              }
            }
          ],
          'tokenRange': [11, 19],
          'type': 'stmts'
        },
        'catchId': {
          'index': 22,
          'lexeme': 'ex',
          loc: loc(8, 18, 8, 20),
          'tag': 2
        },
        'catchBlock': {
          stmts: [
            {
              'args': [
                {
                  'elements': [
                    {
                      'type': 'element',
                      'value': {
                        'index': 29,
                        loc: loc(9, 23, 9, 38),
                        'string': 'error message: ',
                        'tag': 12,
                        'tail': false
                      }
                    },
                    {
                      'expr': {
                        'id': {
                          'index': 30,
                          'lexeme': 'ex',
                          loc: loc(9, 40, 9, 42),
                          'tag': 2
                        },
                        'propertyPath': [
                          {
                            'index': 32,
                            'lexeme': 'message',
                            loc: loc(9, 43, 9, 50),
                            'tag': 2
                          }
                        ],
                        loc: loc(9, 40, 9, 52),
                        'tokenRange': [30, 33],
                        'type': 'property_access'
                      },
                      'type': 'expr'
                    },
                    {
                      'type': 'element',
                      'value': {
                        'index': 33,
                        loc: loc(9, 51, 9, 51),
                        'string': '',
                        'tag': 12,
                        'tail': true
                      }
                    }
                  ],
                  'tokenRange': [29, 34],
                  'type': 'template_string'
                }
              ],
              loc: loc(9, 11, 9, 53),
              'type': 'call',
              'tokenRange': [25, 35],
              'left': {
                'id': {
                  'index': 25,
                  'lexeme': 'Util',
                  'loc': loc(9, 11, 9, 15),
                  'tag': 2
                },
                'propertyPath': [
                  {
                    'index': 27,
                    'lexeme': 'print',
                    'loc': loc(9, 16, 9, 21),
                    'tag': 2
                  }
                ],
                'type': 'static_or_instance_call'
              }
            }
          ],
          'tokenRange': [24, 36],
          'type': 'stmts'
        },
        'finallyBlock': null
      }
    ]);
    ast = parse(`
    
      import Util

      function func(): void  {
        try {
          Util.print("try block");
        } finally {
          Util.print("finally block");
        }
      }
    `, '__filename');
    
    [ func ] = ast.moduleBody.nodes;
    expect(func.type).to.be('function');
    expect(func.functionBody.stmts.stmts).to.eql([
      {
        'type': 'try',
        'tokenRange': [10, 29],
        'tryBlock': {
          'stmts': [
            {
              'args': [
                string('try block', 7, 23, 7, 32, 16, 16, 17)
              ],
              loc: loc(7, 11, 7, 34),
              'type': 'call',
              'tokenRange': [12, 18],
              'left': {
                'id': {
                  'index': 12,
                  'lexeme': 'Util',
                  'loc': loc(7, 11, 7, 15),
                  'tag': 2
                },
                'propertyPath': [
                  {
                    'index': 14,
                    'lexeme': 'print',
                    'loc': loc(7, 16, 7, 21),
                    'tag': 2
                  }
                ],
                'type': 'static_or_instance_call'
              }
            }
          ],
          'tokenRange': [11, 19],
          'type': 'stmts'
        },
        'catchId': null,
        'catchBlock': null,
        'finallyBlock': {
          'stmts': [
            {
              'args': [
                string('finally block', 9, 23, 9, 36, 26, 26, 27)
              ],
              loc: loc(9, 11, 9, 38),
              'type': 'call',
              'tokenRange': [22, 28],
              'left': {
                'id': {
                  'index': 22,
                  'lexeme': 'Util',
                  'loc': loc(9, 11, 9, 15),
                  'tag': 2
                },
                'propertyPath': [
                  {
                    'index': 24,
                    'lexeme': 'print',
                    'loc': loc(9, 16, 9, 21),
                    'tag': 2
                  }
                ],
                'type': 'static_or_instance_call'
              }
            }
          ],
          'tokenRange': [21, 29],
          'type': 'stmts'
        }
      }
    ]);
    expect(() => {
      parse(`
    
      import Util

      function func(): void  {
        try {
          Util.print("try block");
        }
      }
    `, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`Unexpected token: }. "try" expect "catch" or "finally"`);
    });
  });

  it('while should ok', function () {
    var ast = parse(`
    
      function func(): void  {
        while (true) {

        }
      }
    `, '__filename');
    const [func] = ast.moduleBody.nodes;
    expect(func.type).to.be('function');
    expect(func.functionBody.stmts.stmts).to.eql([
      {
        'type': 'while',
        'tokenRange': [8, 13],
        'condition': {
          loc: loc(4, 16, 4, 20),
          'tokenRange': [10, 11],
          'type': 'boolean',
          'value': true
        },
        'stmts': {
          'stmts': [],
          'tokenRange': [12, 13],
          'type': 'stmts'
        }
      }
    ]);
  });

  it('for should ok', function () {
    var ast = parse(`
    
      function func(): void  {
        for (var id : []) {
        }
      }
    `, '__filename');
    const [func] = ast.moduleBody.nodes;
    expect(func.type).to.be('function');
    expect(func.functionBody.stmts.stmts).to.eql([
      {
        'type': 'for',
        'tokenRange': [8, 17],
        'list': {
          'tokenRange': [13, 15],
          'items': [],
          'type': 'array'
        },
        'id': {
          'index': 11,
          'lexeme': 'id',
          loc: loc(4, 18, 4, 20),
          'tag': 2
        },
        'stmts': {
          'stmts': [],
          'tokenRange': [16, 17],
          'type': 'stmts'
        }
      }
    ]);
  });

  it('break should ok', function () {
    var ast = parse(`
    
      function func(): void  {
        for (var id : []) {
          break;
        }
      }
    `, '__filename');
    const [func] = ast.moduleBody.nodes;
    expect(func.type).to.be('function');
    expect(func.functionBody.stmts.stmts).to.eql([
      {
        'type': 'for',
        'tokenRange': [8, 19],
        'list': {
          'items': [],
          'tokenRange': [13, 15],
          'type': 'array'
        },
        'id': {
          'index': 11,
          'lexeme': 'id',
          loc: loc(4, 18, 4, 20),
          'tag': 2
        },
        'stmts': {
          'stmts': [
            {
              'tokenRange': [17, 18],
              'type': 'break'
            }
          ],
          'tokenRange': [16, 19],
          'type': 'stmts'
        }
      }
    ]);
  });

  it('support class in parameters', function () {
    var ast = parse(`
      model M = {
        N: {

        }
      }
      static function test(a: class): void;
      function func(): void  {
        test(M.N);
      }
    `, '__filename');

    const [, type, func] = ast.moduleBody.nodes;
    expect(type).to.eql({
      'annotation': undefined,
      'type': 'function',
      'tokenRange': [10, 20],
      'functionBody': null,
      'functionName': {
        'index': 12,
        'lexeme': 'test',
        'loc': loc(7, 23, 7, 27),
        'tag': 2
      },
      'isAsync': false,
      'isStatic': true,
      'hasThrow': false,
      'params': {
        'params': [
          {
            'defaultValue': null,
            'paramName': {
              'index': 14,
              'lexeme': 'a',
              'loc': loc(7, 28, 7, 29),
              'tag': 2
            },
            'paramType': {
              'index': 16,
              'lexeme': 'class',
              'loc': loc(7, 31, 7, 36),
              'tag': 8
            },
            'type': 'param'
          }
        ],
        'type': 'params'
      },
      'returnType': {
        'index': 19,
        'lexeme': 'void',
        'loc': loc(7, 39, 7, 43),
        'tag': 8
      }
    });

    expect(func.functionBody.stmts.stmts).to.eql([
      {
        'args': [
          {
            'id': {
              'index': 30,
              'lexeme': 'M',
              'loc': loc(9, 14, 9, 15),
              'tag': 2
            },
            'loc': loc(9, 14, 9, 17),
            'propertyPath': [
              {
                'index': 32,
                'lexeme': 'N',
                loc: loc(9, 16, 9, 17),
                'tag': 2
              }
            ],
            'tokenRange': [30, 33],
            'type': 'property_access'
          }
        ],
        'left': {
          'id': {
            'index': 28,
            'lexeme': 'test',
            'loc': loc(9, 9, 9, 13),
            'tag': 2,
          },
          'type': 'method_call'
        },
        'loc': loc(9, 9, 9, 18),
        'tokenRange': [28, 34],
        'type': 'call',
      }
    ]);
  });

  it('support not expr', function () {
    var ast = parse(`
    
      static function func(): boolean  {
        return !true;
      }
    `, '__filename');

    const [func] = ast.moduleBody.nodes;
    expect(func.functionBody.stmts.stmts).to.eql([
      {
        'expr': {
          'expr': {
            'loc': loc(4, 17, 4, 21),
            'type': 'boolean',
            'value': true
          },
          'tokenRange': [10, 12],
          'type': 'not',
          loc: loc(4, 16, 4, 21)
        },
        loc: loc(4, 9, 5, 7),
        'tokenRange': [9, 12],
        'type': 'return'
      }
    ]);
  });

  it('support init body', function () {
    var ast = parse(`
    init(){
    }`, '__filename');

    const [init] = ast.moduleBody.nodes;
    expect(init.type).to.equal('init');
    expect(init.initBody).to.eql({
      type: 'stmts',
      'tokenRange': [4, 5],
      stmts: []
    });
  });

  it('extends should ok', function () {
    var ast = parse(`
    extends Base;
    `, '__filename');

    expect(ast.extends).to.eql({
      'index': 2,
      'lexeme': 'Base',
      'loc': loc(2, 13, 2, 17),
      'tokenRange': [1, 3],
      'tag': 2
    });
  });

  it('extends should ok(comma is optional)', function () {
    var ast = parse(`
    extends Base
    `, '__filename');

    expect(ast.extends).to.eql({
      'index': 2,
      'lexeme': 'Base',
      'loc': loc(2, 13, 2, 17),
      'tag': 2,
      'tokenRange': [1, 2],
    });
  });

  it('comment around global annotation should ok', function () {
    var ast = parse(`
    // front annotation comment
    /**
    * global annotation
    */
    // back annotation comment
    `, '__filename');

    expect(ast.annotation).to.eql({
      'index': 2,
      'loc': loc(3, 5, 5, 7),
      'value': '/**\n    * global annotation\n    */',
      'tag': 19
    });

    expect(ast.comments.get(1)).to.eql({
      'index': 1,
      'loc': loc(2, 5, 2, 32),
      'value': '// front annotation comment',
      'tag': 20
    });
    expect(ast.comments.get(3)).to.eql({
      'index': 3,
      'loc': loc(6, 5, 6, 31),
      'value': '// back annotation comment',
      'tag': 20
    });
  });

  it('comment about import should ok', function () {
    var ast = parse(`
    // front import comment
    import oss
    // back import comment
    `, '__filename');

    expect(ast.imports).to.eql([{
      'index': 3,
      'loc': loc(3, 12, 3, 15),
      'lexeme': 'oss',
      'tokenRange': [2, 3],
      'tag': 2
    }]);
    expect(ast.comments.get(1)).to.eql({
      'index': 1,
      'loc': loc(2, 5, 2, 28),
      'value': '// front import comment',
      'tag': 20
    });
    expect(ast.comments.get(4)).to.eql({
      'index': 4,
      'loc': loc(4, 5, 4, 27),
      'value': '// back import comment',
      'tag': 20
    });

    ast = parse(`
    // front oss import comment
    import oss
    // front util import comment
    import  Util
    // back import comment
    `, '__filename');

    expect(ast.imports).to.eql([{
      'index': 3,
      'loc': loc(3, 12, 3, 15),
      'lexeme': 'oss',
      'tokenRange': [2, 3],
      'tag': 2
    }, {
      'index': 6,
      'loc': loc(5, 13, 5, 17),
      'lexeme': 'Util',
      'tokenRange': [5, 6],
      'tag': 2
    }]);
    expect(ast.comments.get(1)).to.eql({
      'index': 1,
      'loc': loc(2, 5, 2, 32),
      'value': '// front oss import comment',
      'tag': 20
    });
    expect(ast.comments.get(4)).to.eql({
      'index': 4,
      'loc': loc(4, 5, 4, 33),
      'value': '// front util import comment',
      'tag': 20
    });
    expect(ast.comments.get(7)).to.eql({
      'index': 7,
      'loc': loc(6, 5, 6, 27),
      'value': '// back import comment',
      'tag': 20
    });
  });

  it('comment about model should ok', function () {
    var ast = parse(`
    // front model comment
    model M{
      // empty model
    }
    // back model comment
    `, '__filename');
    let [model] = ast.moduleBody.nodes;
    expect(model).to.eql({
      'type': 'model',
      'annotation': undefined,
      'tokenRange': [2, 6],
      'modelBody': {
        'nodes': [],
        'tokenRange': [4, 6],
        'type': 'modelBody'
      },
      'modelName': {
        'index': 3,
        'lexeme': 'M',
        'tag': 2,
        loc: loc(3, 11, 3, 12)
      },
    });
    expect(ast.comments.get(1)).to.eql({
      'index': 1,
      'loc': loc(2, 5, 2, 27),
      'value': '// front model comment',
      'tag': 20
    });
    expect(ast.comments.get(5)).to.eql({
      'index': 5,
      'loc': loc(4, 7, 4, 21),
      'value': '// empty model',
      'tag': 20
    });
    expect(ast.comments.get(7)).to.eql({
      'index': 7,
      'loc': loc(6, 5, 6, 26),
      'value': '// back model comment',
      'tag': 20
    });

    ast = parse(`
    model M{
      // attr1 comment
      attr1: string,
      attr2: string
      // attr2 comment
    }
    `, '__filename');

    [model] = ast.moduleBody.nodes;
    expect(model).to.eql({
      'annotation': undefined,
      'type': 'model',
      'modelName': {
        'tag': 2,
        'loc': loc(2, 11, 2, 12),
        'lexeme': 'M',
        'index': 2
      },
      'modelBody': {
        'type': 'modelBody',
        'nodes': [
          {
            'type': 'modelField',
            'fieldName': {
              'tag': 2,
              'loc': loc(4, 7, 4, 12),
              'lexeme': 'attr1',
              'index': 5
            },
            'required': true,
            'fieldValue': {
              'type': 'fieldType',
              'fieldType': 'string'
            },
            'attrs': [],
            'tokenRange': [
              5,
              8
            ]
          },
          {
            'type': 'modelField',
            'fieldName': {
              'tag': 2,
              'loc': loc(5, 7, 5, 12),
              'lexeme': 'attr2',
              'index': 9
            },
            'required': true,
            'fieldValue': {
              'type': 'fieldType',
              'fieldType': 'string'
            },
            'attrs': [],
            'tokenRange': [
              9,
              13
            ]
          }
        ],
        'tokenRange': [
          3,
          13
        ]
      },
      'tokenRange': [
        1,
        13
      ]
    });
    expect(ast.comments.get(4)).to.eql({
      'index': 4,
      'loc': loc(3, 7, 3, 23),
      'value': '// attr1 comment',
      'tag': 20
    });
    expect(ast.comments.get(12)).to.eql({
      'index': 12,
      'loc': loc(6, 7, 6, 23),
      'value': '// attr2 comment',
      'tag': 20
    });
  });

  it('comment about init should ok', function () {
    var ast = parse(`
    // front init comment
    init(){
      // empty init
    }
    // back init comment
    `, '__filename');
    let [init] = ast.moduleBody.nodes;
    expect(init).to.eql({
      'annotation': undefined,
      'type': 'init',
      'loc': loc(3, 5, 7, 5),
      'params': {
        'type': 'params',
        'params': []
      },
      'initBody': {
        'type': 'stmts',
        'stmts': [],
        'tokenRange': [
          5,
          7
        ]
      },
      'tokenRange': [
        2,
        7
      ]
    });

    expect(ast.comments.get(1)).to.eql({
      'index': 1,
      'loc': loc(2, 5, 2, 26),
      'value': '// front init comment',
      'tag': 20
    });
    expect(ast.comments.get(6)).to.eql({
      'index': 6,
      'loc': loc(4, 7, 4, 20),
      'value': '// empty init',
      'tag': 20
    });
    expect(ast.comments.get(8)).to.eql({
      'index': 8,
      'loc': loc(6, 5, 6, 25),
      'value': '// back init comment',
      'tag': 20
    });

    ast = parse(`
    // delare @a
    type @a = string 
    init(){
      // assign @a
      @a = 'abc';
      // return void
      return;
      // end init
    }
    `, '__filename');
    let [type, initFunc] = ast.moduleBody.nodes;
    expect(type).to.eql({
      'annotation': undefined,
      'type': 'type',
      'vid': {
        'tag': 3,
        'loc': loc(3, 10, 3, 12),
        'lexeme': '@a',
        'index': 3
      },
      'value': {
        'tag': 8,
        'loc': {
          'start': {
            'line': 3,
            'column': 15
          },
          'end': {
            'line': 3,
            'column': 21
          }
        },
        'lexeme': 'string',
        'index': 5
      },
      'tokenRange': [
        2,
        6
      ]
    });
    expect(initFunc).to.eql({
      'annotation': undefined,
      'type': 'init',
      'loc': loc(4, 5, 11, 5),
      'params': {
        'type': 'params',
        'params': []
      },
      'initBody': {
        'type': 'stmts',
        'stmts': [
          {
            'type': 'assign',
            'left': {
              'type': 'virtualVariable',
              'vid': {
                'tag': 3,
                'loc': loc(6, 7, 6, 9),
                'lexeme': '@a',
                'index': 11
              }
            },
            'expr': {
              'type': 'string',
              'value': {
                'tag': 1,
                'loc': loc(6, 13, 6, 16),
                'string': 'abc',
                'index': 13
              },
              'loc': loc(6, 13, 6, 16),
              'tokenRange': [
                13,
                14
              ]
            },
            'loc': loc(6, 7, 6, 17),
            'tokenRange': [
              11,
              14
            ]
          },
          {
            'type': 'return',
            'loc': loc(8, 7, 10, 5),
            'tokenRange': [
              16,
              17
            ]
          }
        ],
        'tokenRange': [
          9,
          19
        ]
      },
      'tokenRange': [
        6,
        19
      ]
    });

    expect(ast.comments.get(1)).to.eql({
      'index': 1,
      'loc': loc(2, 5, 2, 17),
      'value': '// delare @a',
      'tag': 20
    });
    expect(ast.comments.get(10)).to.eql({
      'index': 10,
      'loc': loc(5, 7, 5, 19),
      'value': '// assign @a',
      'tag': 20
    });
    expect(ast.comments.get(15)).to.eql({
      'index': 15,
      'loc': loc(7, 7, 7, 21),
      'value': '// return void',
      'tag': 20
    });
    expect(ast.comments.get(18)).to.eql({
      'index': 18,
      'loc': loc(9, 7, 9, 18),
      'value': '// end init',
      'tag': 20
    });
  });

  it('comment about api should ok', function () {
    var ast = parse(`
    // front api comment
    api testAPI(): void{
      // empty api
    } returns {
      // empty return
    } runtime {
      // empty runtime
    }
    // back api comment
    `, '__filename');
    let [emptyApi] = ast.moduleBody.nodes;
    expect(emptyApi).to.eql({
      'annotation': undefined,
      'type': 'api',
      'apiName': {
        'tag': 2,
        'loc': loc(3, 9, 3, 16),
        'lexeme': 'testAPI',
        'index': 3
      },
      'params': {
        'type': 'params',
        'params': []
      },
      'returnType': {
        'tag': 8,
        'loc': loc(3, 20, 3, 24),
        'lexeme': 'void',
        'index': 7
      },
      'apiBody': {
        'type': 'apiBody',
        'stmts': {
          'type': 'stmts',
          'stmts': [],
          'tokenRange': [
            8,
            10
          ]
        },
        'tokenRange': [
          8,
          10
        ]
      },
      'returns': {
        'type': 'returnBody',
        'loc': loc(5, 15, 7, 14),
        'stmts': {
          'type': 'stmts',
          'stmts': [],
          'tokenRange': [
            12,
            14
          ]
        },
        'tokenRange': [
          12,
          14
        ]
      },
      'runtimeBody': {
        'type': 'object',
        'fields': [],
        'loc': loc(7, 15, 11, 5),
        'tokenRange': [
          16,
          18
        ]
      },
      'tokenRange': [
        2,
        18
      ]
    });

    expect(ast.comments.get(1)).to.eql({
      'index': 1,
      'loc': loc(2, 5, 2, 25),
      'value': '// front api comment',
      'tag': 20
    });
    expect(ast.comments.get(9)).to.eql({
      'index': 9,
      'loc': loc(4, 7, 4, 19),
      'value': '// empty api',
      'tag': 20
    });
    expect(ast.comments.get(13)).to.eql({
      'index': 13,
      'loc': loc(6, 7, 6, 22),
      'value': '// empty return',
      'tag': 20
    });
    expect(ast.comments.get(17)).to.eql({
      'index': 17,
      'loc': loc(8, 7, 8, 23),
      'value': '// empty runtime',
      'tag': 20
    });
    expect(ast.comments.get(19)).to.eql({
      'index': 19,
      'loc': loc(10, 5, 10, 24),
      'value': '// back api comment',
      'tag': 20
    });

    ast = parse(`
    model M = {
      test: string
    };
    // front const comment
    const con = 'abc';
    // back const comment
    api testAPI(): void{
      // if judge comment
      if (true){
        // catch the error
        try{
          // while comment
          while(1) { 
             // declare a constructor
            var m = new M {
              // init M.test
              test = con
              // end init
            };
            // declare end and break loop
            break;
            // back break
          }
        }catch(err){
          // empty catch
        }
        // end if judge
      } else {
        // empty else
      }
      // api end
    } returns {
      // empty void
      return;
      // end returns
    } runtime {
      // runtime retry
      retry = true
      // end runtime
    }
    `, '__filename');
    let [, con, api] = ast.moduleBody.nodes;

    expect(con).to.eql({
      'annotation': undefined,
      'type': 'const',
      'constName': {
        'tag': 2,
        'loc': loc(6, 11, 6, 14),
        'lexeme': 'con',
        'index': 12
      },
      'constValue': {
        'tag': 1,
        'loc': loc(6, 18, 6, 21),
        'string': 'abc',
        'index': 14
      },
      'tokenRange': [
        11,
        15
      ]
    });

    expect(api).to.eql({
      'annotation': undefined,
      'type': 'api',
      'apiName': {
        'tag': 2,
        'loc': loc(8, 9, 8, 16),
        'lexeme': 'testAPI',
        'index': 18
      },
      'params': {
        'type': 'params',
        'params': []
      },
      'returnType': {
        'tag': 8,
        'loc': loc(8, 20, 8, 24),
        'lexeme': 'void',
        'index': 22
      },
      'apiBody': {
        'type': 'apiBody',
        'stmts': {
          'type': 'stmts',
          'stmts': [
            {
              'type': 'if',
              'condition': {
                'type': 'boolean',
                'value': true,
                'loc': loc(10, 11, 10, 15),
                'tokenRange': [
                  27,
                  28
                ]
              },
              'stmts': {
                'type': 'stmts',
                'stmts': [
                  {
                    'type': 'try',
                    'tryBlock': {
                      'type': 'stmts',
                      'stmts': [
                        {
                          'type': 'while',
                          'condition': {
                            'type': 'number',
                            'value': {
                              'tag': 9,
                              'loc': loc(14, 17, 14, 18),
                              'value': 1,
                              'type': 'integer',
                              'index': 36
                            },
                            'loc': loc(14, 17, 14, 18),
                            'tokenRange': [
                              36,
                              37
                            ]
                          },
                          'stmts': {
                            'type': 'stmts',
                            'stmts': [
                              {
                                'expectedType': undefined,
                                'type': 'declare',
                                'id': {
                                  'tag': 2,
                                  'loc': loc(16, 17, 16, 18),
                                  'lexeme': 'm',
                                  'index': 41
                                },
                                'expr': {
                                  'type': 'construct_model',
                                  'aliasId': {
                                    'tag': 2,
                                    'loc': loc(16, 25, 16, 26),
                                    'lexeme': 'M',
                                    'index': 44
                                  },
                                  'propertyPath': [],
                                  'object': {
                                    'type': 'object',
                                    'fields': [
                                      {
                                        'type': 'objectField',
                                        'fieldName': {
                                          'tag': 2,
                                          'loc': loc(18, 15, 18, 19),
                                          'lexeme': 'test',
                                          'index': 47
                                        },
                                        'expr': {
                                          'type': 'variable',
                                          'id': {
                                            'tag': 2,
                                            'loc': loc(18, 22, 18, 25),
                                            'lexeme': 'con',
                                            'index': 49
                                          },
                                          'loc': loc(18, 22, 18, 25),
                                          'tokenRange': [
                                            49,
                                            51
                                          ]
                                        },
                                        'tokenRange': [
                                          47,
                                          51
                                        ]
                                      }
                                    ],
                                    'loc': loc(16, 27, 20, 14),
                                    'tokenRange': [
                                      45,
                                      51
                                    ]
                                  },
                                  'tokenRange': [
                                    43,
                                    52
                                  ]
                                },
                                'tokenRange': [
                                  40,
                                  52
                                ]
                              },
                              {
                                'type': 'break',
                                'tokenRange': [
                                  54,
                                  55
                                ]
                              }
                            ],
                            'tokenRange': [
                              38,
                              57
                            ]
                          },
                          'tokenRange': [
                            34,
                            57
                          ]
                        }
                      ],
                      'tokenRange': [
                        32,
                        58
                      ]
                    },
                    'catchId': {
                      'tag': 2,
                      'loc': loc(25, 16, 25, 19),
                      'lexeme': 'err',
                      'index': 61
                    },
                    'catchBlock': {
                      'type': 'stmts',
                      'stmts': [],
                      'tokenRange': [
                        63,
                        65
                      ]
                    },
                    'finallyBlock': null,
                    'tokenRange': [
                      31,
                      65
                    ]
                  }
                ],
                'tokenRange': [
                  29,
                  67
                ]
              },
              'elseIfs': [],
              'elseStmts': {
                'type': 'stmts',
                'stmts': [],
                'tokenRange': [
                  69,
                  71
                ]
              },
              'tokenRange': [
                25,
                71
              ]
            }
          ],
          'tokenRange': [
            23,
            73
          ]
        },
        'tokenRange': [
          23,
          73
        ]
      },
      'returns': {
        'type': 'returnBody',
        'loc': loc(33, 15, 37, 14),
        'stmts': {
          'type': 'stmts',
          'stmts': [
            {
              'type': 'return',
              'loc': loc(35, 7, 37, 5),
              'tokenRange': [
                77,
                78
              ]
            }
          ],
          'tokenRange': [
            75,
            80
          ]
        },
        'tokenRange': [
          75,
          80
        ]
      },
      'runtimeBody': {
        'type': 'object',
        'fields': [
          {
            'type': 'objectField',
            'fieldName': {
              'tag': 2,
              'loc': loc(39, 7, 39, 12),
              'lexeme': 'retry',
              'index': 84
            },
            'expr': {
              'type': 'boolean',
              'value': true,
              'loc': loc(39, 15, 39, 19),
              'tokenRange': [
                86,
                88
              ]
            },
            'tokenRange': [
              84,
              88
            ]
          }
        ],
        'loc': loc(37, 15, 42, 5),
        'tokenRange': [
          82,
          88
        ]
      },
      'tokenRange': [
        17,
        88
      ]
    });
    expect(ast.comments.get(10)).to.eql({
      'index': 10,
      'loc': loc(5, 5, 5, 27),
      'value': '// front const comment',
      'tag': 20
    });
    expect(ast.comments.get(16)).to.eql({
      'index': 16,
      'loc': loc(7, 5, 7, 26),
      'value': '// back const comment',
      'tag': 20
    });
    expect(ast.comments.get(24)).to.eql({
      'index': 24,
      'loc': loc(9, 7, 9, 26),
      'value': '// if judge comment',
      'tag': 20
    });
    expect(ast.comments.get(30)).to.eql({
      'index': 30,
      'loc': loc(11, 9, 11, 27),
      'value': '// catch the error',
      'tag': 20
    });
    expect(ast.comments.get(33)).to.eql({
      'index': 33,
      'loc': loc(13, 11, 13, 27),
      'value': '// while comment',
      'tag': 20
    });
    expect(ast.comments.get(39)).to.eql({
      'index': 39,
      'loc': loc(15, 14, 15, 38),
      'value': '// declare a constructor',
      'tag': 20
    });
    expect(ast.comments.get(46)).to.eql({
      'index': 46,
      'loc': loc(17, 15, 17, 29),
      'value': '// init M.test',
      'tag': 20
    });
    expect(ast.comments.get(50)).to.eql({
      'index': 50,
      'loc': loc(19, 15, 19, 26),
      'value': '// end init',
      'tag': 20
    });
    expect(ast.comments.get(53)).to.eql({
      'index': 53,
      'loc': loc(21, 13, 21, 42),
      'value': '// declare end and break loop',
      'tag': 20
    });
    expect(ast.comments.get(56)).to.eql({
      'index': 56,
      'loc': loc(23, 13, 23, 26),
      'value': '// back break',
      'tag': 20
    });
    expect(ast.comments.get(64)).to.eql({
      'index': 64,
      'loc': loc(26, 11, 26, 25),
      'value': '// empty catch',
      'tag': 20
    });
    expect(ast.comments.get(66)).to.eql({
      'index': 66,
      'loc': loc(28, 9, 28, 24),
      'value': '// end if judge',
      'tag': 20
    });
    expect(ast.comments.get(70)).to.eql({
      'index': 70,
      'loc': loc(30, 9, 30, 22),
      'value': '// empty else',
      'tag': 20
    });
    expect(ast.comments.get(72)).to.eql({
      'index': 72,
      'loc': loc(32, 7, 32, 17),
      'value': '// api end',
      'tag': 20
    });
    expect(ast.comments.get(76)).to.eql({
      'index': 76,
      'loc': loc(34, 7, 34, 20),
      'value': '// empty void',
      'tag': 20
    });
    expect(ast.comments.get(79)).to.eql({
      'index': 79,
      'loc': loc(36, 7, 36, 21),
      'value': '// end returns',
      'tag': 20
    });
    expect(ast.comments.get(83)).to.eql({
      'index': 83,
      'loc': loc(38, 7, 38, 23),
      'value': '// runtime retry',
      'tag': 20
    });
    expect(ast.comments.get(87)).to.eql({
      'index': 87,
      'loc': loc(40, 7, 40, 21),
      'value': '// end runtime',
      'tag': 20
    });
  });

  it('comment about fun should ok', function () {
    var ast = parse(`
    // front func comment
    static function testFunc(): void{
      // empty func
    }
    // back func comment
    `, '__filename');
    let [emptyFunc] = ast.moduleBody.nodes;
    expect(emptyFunc).to.eql({
      'annotation': undefined,
      'type': 'function',
      'isStatic': true,
      'isAsync': false,
      'hasThrow': false,
      'functionName': {
        'tag': 2,
        'loc': loc(3, 21, 3, 29),
        'lexeme': 'testFunc',
        'index': 4
      },
      'params': {
        'type': 'params',
        'params': []
      },
      'returnType': {
        'tag': 8,
        'loc': loc(3, 33, 3, 37),
        'lexeme': 'void',
        'index': 8
      },
      'functionBody': {
        'type': 'functionBody',
        'loc': loc(3, 37, 7, 5),
        'stmts': {
          'type': 'stmts',
          'stmts': [],
          'tokenRange': [
            9,
            11
          ]
        },
        'tokenRange': [
          9,
          11
        ]
      },
      'tokenRange': [
        2,
        11
      ]
    });

    expect(ast.comments.get(1)).to.eql({
      'index': 1,
      'loc': loc(2, 5, 2, 26),
      'value': '// front func comment',
      'tag': 20
    });
    expect(ast.comments.get(10)).to.eql({
      'index': 10,
      'loc': loc(4, 7, 4, 20),
      'value': '// empty func',
      'tag': 20
    });
    expect(ast.comments.get(12)).to.eql({
      'index': 12,
      'loc': loc(6, 5, 6, 25),
      'value': '// back func comment',
      'tag': 20
    });

    ast = parse(`
    static function testFunc(): string{
      // declare a
      var a = 'test';
      // return a
      return a;
      // end func
    }
    `, '__filename');

    let [func] = ast.moduleBody.nodes;
    expect(func).to.eql({
      'annotation': undefined,
      'type': 'function',
      'isStatic': true,
      'isAsync': false,
      'hasThrow': false,
      'functionName': {
        'tag': 2,
        'loc': loc(2, 21, 2, 29),
        'lexeme': 'testFunc',
        'index': 3
      },
      'params': {
        'type': 'params',
        'params': []
      },
      'returnType': {
        'tag': 8,
        'loc': loc(2, 33, 2, 39),
        'lexeme': 'string',
        'index': 7
      },
      'functionBody': {
        'type': 'functionBody',
        'loc': loc(2, 39, 9, 5),
        'stmts': {
          'type': 'stmts',
          'stmts': [
            {
              'expectedType': undefined,
              'type': 'declare',
              'id': {
                'tag': 2,
                'loc': loc(4, 11, 4, 12),
                'lexeme': 'a',
                'index': 11
              },
              'expr': {
                'type': 'string',
                'value': {
                  'tag': 1,
                  'loc': loc(4, 16, 4, 20),
                  'string': 'test',
                  'index': 13
                },
                'loc': loc(4, 16, 4, 20),
                'tokenRange': [
                  13,
                  14
                ]
              },
              'tokenRange': [
                10,
                14
              ]
            },
            {
              'type': 'return',
              'expr': {
                'type': 'variable',
                'id': {
                  'tag': 2,
                  'loc': loc(6, 14, 6, 15),
                  'lexeme': 'a',
                  'index': 17
                },
                'loc': loc(6, 14, 6, 15),
                'tokenRange': [
                  17,
                  18
                ]
              },
              'loc': loc(6, 7, 8, 5),
              'tokenRange': [
                16,
                18
              ]
            }
          ],
          'tokenRange': [
            8,
            20
          ]
        },
        'tokenRange': [
          8,
          20
        ]
      },
      'tokenRange': [
        1,
        20
      ]
    });

    expect(ast.comments.get(9)).to.eql({
      'index': 9,
      'loc': loc(3, 7, 3, 19),
      'value': '// declare a',
      'tag': 20
    });
    expect(ast.comments.get(15)).to.eql({
      'index': 15,
      'loc': loc(5, 7, 5, 18),
      'value': '// return a',
      'tag': 20
    });
    expect(ast.comments.get(19)).to.eql({
      'index': 19,
      'loc': loc(7, 7, 7, 18),
      'value': '// end func',
      'tag': 20
    });
  });

  it('comment about rpc should ok', function () {
    var ast = parse(`
    // front rpc comment
    rpc test(): void{
      // empty rpc
    }
    // back rpc comment
    `, '__filename');
    let [emptyRpc] = ast.moduleBody.nodes;
    expect(emptyRpc).to.eql({
      'annotation': undefined,
      'type': 'rpc',
      'rpcName': {
        'tag': 2,
        'loc': loc(3, 9, 3, 13),
        'lexeme': 'test',
        'index': 3
      },
      'params': {
        'type': 'params',
        'params': []
      },
      'returnType': {
        'tag': 8,
        'loc': loc(3, 17, 3, 21),
        'lexeme': 'void',
        'index': 7
      },
      'rpcBody': {
        'type': 'object',
        'fields': [],
        'loc': loc(3, 21, 7, 5),
        'tokenRange': [
          8,
          10
        ]
      }
    });
    expect(ast.comments.get(1)).to.eql({
      'index': 1,
      'loc': loc(2, 5, 2, 25),
      'value': '// front rpc comment',
      'tag': 20
    });
    expect(ast.comments.get(9)).to.eql({
      'index': 9,
      'loc': loc(4, 7, 4, 19),
      'value': '// empty rpc',
      'tag': 20
    });
    expect(ast.comments.get(11)).to.eql({
      'index': 11,
      'loc': loc(6, 5, 6, 24),
      'value': '// back rpc comment',
      'tag': 20
    });

    ast = parse(`
    rpc test(): void{
      // attr1 comment
      attr1 = 'string',
      attr2 = 123
      // attr2 comment
    }
    `, '__filename');

    let [rpc] = ast.moduleBody.nodes;
    expect(rpc).to.eql({
      'annotation': undefined,
      'type': 'rpc',
      'rpcName': {
        'tag': 2,
        'loc': loc(2, 9, 2, 13),
        'lexeme': 'test',
        'index': 2
      },
      'params': {
        'type': 'params',
        'params': []
      },
      'returnType': {
        'tag': 8,
        'loc': loc(2, 17, 2, 21),
        'lexeme': 'void',
        'index': 6
      },
      'rpcBody': {
        'type': 'object',
        'fields': [
          {
            'type': 'objectField',
            'fieldName': {
              'tag': 2,
              'loc': loc(4, 7, 4, 12),
              'lexeme': 'attr1',
              'index': 9
            },
            'expr': {
              'type': 'string',
              'value': {
                'tag': 1,
                'loc': loc(4, 16, 4, 22),
                'string': 'string',
                'index': 11
              },
              'loc': loc(4, 16, 4, 22),
              'tokenRange': [
                11,
                12
              ]
            },
            'tokenRange': [
              9,
              12
            ]
          },
          {
            'type': 'objectField',
            'fieldName': {
              'tag': 2,
              'loc': loc(5, 7, 5, 12),
              'lexeme': 'attr2',
              'index': 13
            },
            'expr': {
              'type': 'number',
              'value': {
                'tag': 9,
                'loc': loc(5, 15, 5, 18),
                'value': 123,
                'type': 'integer',
                'index': 15
              },
              'loc': loc(5, 15, 5, 18),
              'tokenRange': [
                15,
                17
              ]
            },
            'tokenRange': [
              13,
              17
            ]
          }
        ],
        'loc': loc(2, 21, 8, 5),
        'tokenRange': [
          7,
          17
        ]
      }
    });
    expect(ast.comments.get(8)).to.eql({
      'index': 8,
      'loc': loc(3, 7, 3, 23),
      'value': '// attr1 comment',
      'tag': 20
    });
    expect(ast.comments.get(16)).to.eql({
      'index': 16,
      'loc': loc(6, 7, 6, 23),
      'value': '// attr2 comment',
      'tag': 20
    });
  });

  it('map access(vid) should ok', function () {
    var ast = parse(`
      type @id = map[string]string
      async function test(): void {
        return @id['key'];
      }
    `, '__filename');
    let [, func1] = ast.moduleBody.nodes;
    const [expr] = func1.functionBody.stmts.stmts;
    expect(expr.expr).to.eql({
      'accessKey': {
        'loc': loc(4, 21, 4, 24),
        'tokenRange': [20, 21],
        'type': 'string',
        'value': {
          'index': 20,
          'loc': loc(4, 21, 4, 24),
          'string': 'key',
          'tag': 1
        }
      },
      'id': {
        'index': 18,
        'lexeme': '@id',
        'loc': loc(4, 16, 4, 19),
        'tag': 3
      },
      loc: loc(4, 16, 4, 26),
      'tokenRange': [
        18,
        22
      ],
      'type': 'map_access'
    });
  });

  it('map access(vid.property) should ok', function () {
    var ast = parse(`
      model M {
        p: map[string]string
      }
      type @id = M;
      async function test(): void {
        return @id.p['key'];
      }
    `, '__filename');
    let [ , , func1] = ast.moduleBody.nodes;
    const [expr] = func1.functionBody.stmts.stmts;
    expect(expr.expr).to.eql({
      'accessKey': {
        'loc': loc(7, 23, 7, 26),
        'tokenRange': [30, 31],
        'type': 'string',
        'value': {
          'index': 30,
          'loc': loc(7, 23, 7, 26),
          'string': 'key',
          'tag': 1
        }
      },
      'id': {
        'index': 26,
        'lexeme': '@id',
        'loc': loc(7, 16, 7, 19),
        'tag': 3
      },
      'propertyPath': [
        {
          'index': 28,
          'lexeme': 'p',
          'loc': loc(7, 20, 7, 21),
          'tag': 2
        }
      ],
      loc: loc(7, 16, 7, 28),
      'tokenRange': [26, 32],
      'type': 'map_access'
    });
  });

  it('map access(id) should ok', function () {
    var ast = parse(`
      async function test(): void {
        var id = {
          key = 'value'
        };
        return id['key'];
      }
    `, '__filename');
    let [func1] = ast.moduleBody.nodes;
    const [ , expr] = func1.functionBody.stmts.stmts;
    expect(expr.expr).to.eql({
      'accessKey': {
        'loc': loc(6, 20, 6, 23),
        'tokenRange': [21, 22],
        'type': 'string',
        'value': {
          'index': 21,
          'loc': loc(6, 20, 6, 23),
          'string': 'key',
          'tag': 1
        }
      },
      'id': {
        'index': 19,
        'lexeme': 'id',
        'loc': loc(6, 16, 6, 18),
        'tag': 2
      },
      loc: loc(6, 16, 6, 25),
      'tokenRange': [
        19,
        23
      ],
      'type': 'map_access'
    });
  });

  it('map access(id.property) should ok', function () {
    var ast = parse(`
      model M {
        p: map[string]string
      }
      async function test(): void {
        var id = new M{};
        return id.p['key'];
      }
    `, '__filename');
    let [ , func1] = ast.moduleBody.nodes;
    const [ , expr] = func1.functionBody.stmts.stmts;
    expect(expr.expr).to.eql({
      'accessKey': {
        'loc': loc(7, 22, 7, 25),
        'tokenRange': [33, 34],
        'type': 'string',
        'value': {
          'index': 33,
          'loc': loc(7, 22, 7, 25),
          'string': 'key',
          'tag': 1
        }
      },
      'id': {
        'index': 29,
        'lexeme': 'id',
        'loc': loc(7, 16, 7, 18),
        'tag': 2
      },
      'propertyPath': [
        {
          'index': 31,
          'lexeme': 'p',
          'loc': loc(7, 19, 7, 20),
          'tag': 2
        }
      ],
      loc: loc(7, 16, 7, 27),
      'tokenRange': [29, 35],
      'type': 'map_access'
    });
  });

  it('super() should ok', function () {
    var ast = parse(`
      init() {
        super();
      }
    `, '__filename');
    let [ init ] = ast.moduleBody.nodes;
    const [expr] = init.initBody.stmts;
    expect(expr).to.eql({
      'args': [],
      'loc': loc(3, 14, 3, 16),
      'tokenRange': [5, 8],
      'type': 'super'
    });
  });

  it('word(api) as model field name should ok', function () {
    expect(function() {
      parse(`
      model M {
        api: string
      }
    `, '__filename');
    }).not.to.throwError();
  });

  it('multi-dimentional array in model field should be ok', function () {
    function modelField(value) {
      var ast = parse(`
        model id = {
          ${value}
        }
      `, '__filename');
      return ast.moduleBody.nodes[0].modelBody;
    }

    expect(modelField(`name?: [[{}]]`)).to.be.eql({
      'type': 'modelBody',
      'nodes': [
        {
          'type': 'modelField',
          'fieldName': {
            'tag': 2,
            'loc': {
              'start': {
                'line': 3,
                'column': 11
              },
              'end': {
                'line': 3,
                'column': 15
              }
            },
            'lexeme': 'name',
            'index': 5
          },
          'required': false,
          'fieldValue': {
            'type': 'fieldType',
            'fieldType': 'array',
            'fieldItemType': {
              'type': 'fieldType',
              'fieldType': 'array',
              'fieldItemType': {
                'type': 'modelBody',
                'nodes': [],
                'tokenRange': [
                  10,
                  11
                ]
              }
            }
          },
          'attrs': [],
          'tokenRange': [
            5,
            14
          ]
        }
      ],
      'tokenRange': [
        4,
        14
      ]
    });

    

    expect(modelField(`name?: [[{
      age: number
    }]]`)).to.be.eql({
      'type': 'modelBody',
      'nodes': [
        {
          'type': 'modelField',
          'fieldName': {
            'tag': 2,
            'loc': {
              'start': {
                'line': 3,
                'column': 11
              },
              'end': {
                'line': 3,
                'column': 15
              }
            },
            'lexeme': 'name',
            'index': 5
          },
          'required': false,
          'fieldValue': {
            'type': 'fieldType',
            'fieldType': 'array',
            'fieldItemType': {
              'type': 'fieldType',
              'fieldType': 'array',
              'fieldItemType': {
                'type': 'modelBody',
                'nodes': [
                  {
                    'type': 'modelField',
                    'fieldName': {
                      'tag': 2,
                      'loc': {
                        'start': {
                          'line': 4,
                          'column': 7
                        },
                        'end': {
                          'line': 4,
                          'column': 10
                        }
                      },
                      'lexeme': 'age',
                      'index': 11
                    },
                    'required': true,
                    'fieldValue': {
                      'type': 'fieldType',
                      'fieldType': 'number'
                    },
                    'attrs': [],
                    'tokenRange': [
                      11,
                      14
                    ]
                  }
                ],
                'tokenRange': [
                  10,
                  14
                ]
              }
            }
          },
          'attrs': [],
          'tokenRange': [
            5,
            17
          ]
        }
      ],
      'tokenRange': [
        4,
        17
      ]
    });

    expect(modelField(`name?: [[[{}]]]`)).to.be.eql({
      'type': 'modelBody',
      'nodes': [
        {
          'type': 'modelField',
          'fieldName': {
            'tag': 2,
            'loc': {
              'start': {
                'line': 3,
                'column': 11
              },
              'end': {
                'line': 3,
                'column': 15
              }
            },
            'lexeme': 'name',
            'index': 5
          },
          'required': false,
          'fieldValue': {
            'type': 'fieldType',
            'fieldType': 'array',
            'fieldItemType': {
              'type': 'fieldType',
              'fieldType': 'array',
              'fieldItemType': {
                'type': 'fieldType',
                'fieldType': 'array',
                'fieldItemType': {
                  'type': 'modelBody',
                  'nodes': [],
                  'tokenRange': [
                    11,
                    12
                  ]
                }
              }
            }
          },
          'attrs': [],
          'tokenRange': [
            5,
            16
          ]
        }
      ],
      'tokenRange': [
        4,
        16
      ]
    });

    expect(modelField(`name?: [[ string ]]`)).to.be.eql({
      'type': 'modelBody',
      'nodes': [
        {
          'type': 'modelField',
          'fieldName': {
            'tag': 2,
            'loc': {
              'start': {
                'line': 3,
                'column': 11
              },
              'end': {
                'line': 3,
                'column': 15
              }
            },
            'lexeme': 'name',
            'index': 5
          },
          'required': false,
          'fieldValue': {
            'type': 'fieldType',
            'fieldType': 'array',
            'fieldItemType': {
              'type': 'fieldType',
              'fieldType': 'array',
              'fieldItemType': {
                'tag': 8,
                'loc': {
                  'start': {
                    'line': 3,
                    'column': 21
                  },
                  'end': {
                    'line': 3,
                    'column': 27
                  }
                },
                'lexeme': 'string',
                'index': 10
              }
            }
          },
          'attrs': [],
          'tokenRange': [
            5,
            13
          ]
        }
      ],
      'tokenRange': [
        4,
        13
      ]
    });

    expect(modelField(`name?: [[[ string ]]]`)).to.be.eql({
      'type': 'modelBody',
      'nodes': [
        {
          'type': 'modelField',
          'fieldName': {
            'tag': 2,
            'loc': {
              'start': {
                'line': 3,
                'column': 11
              },
              'end': {
                'line': 3,
                'column': 15
              }
            },
            'lexeme': 'name',
            'index': 5
          },
          'required': false,
          'fieldValue': {
            'type': 'fieldType',
            'fieldType': 'array',
            'fieldItemType': {
              'type': 'fieldType',
              'fieldType': 'array',
              'fieldItemType': {
                'type': 'fieldType',
                'fieldType': 'array',
                'fieldItemType': {
                  'tag': 8,
                  'loc': {
                    'start': {
                      'line': 3,
                      'column': 22
                    },
                    'end': {
                      'line': 3,
                      'column': 28
                    }
                  },
                  'lexeme': 'string',
                  'index': 11
                }
              }
            }
          },
          'attrs': [],
          'tokenRange': [
            5,
            15
          ]
        }
      ],
      'tokenRange': [
        4,
        15
      ]
    });
  });

  it('string enum should ok', function () {
    var ast = parse(`
      enum E: string {
        str(value='str', description='str'),
      }
    `, '__filename');
    let [enumAst] = ast.moduleBody.nodes;
    expect(enumAst).to.be.eql({
      'type': 'enum',
      'enumName': {
        'tag': 2,
        'loc': {
          'start': {
            'line': 2,
            'column': 12
          },
          'end': {
            'line': 2,
            'column': 13
          }
        },
        'lexeme': 'E',
        'index': 2
      },
      'enumType': {
        'tag': 8,
        'loc': {
          'start': {
            'line': 2,
            'column': 15
          },
          'end': {
            'line': 2,
            'column': 21
          }
        },
        'lexeme': 'string',
        'index': 4
      },
      'enumBody': {
        'type': 'enumBody',
        'nodes': [
          {
            'type': 'enumField',
            'fieldName': {
              'tag': 2,
              'loc': {
                'start': {
                  'line': 3,
                  'column': 9
                },
                'end': {
                  'line': 3,
                  'column': 12
                }
              },
              'lexeme': 'str',
              'index': 6
            },
            'enumAttrs': [
              {
                'type': 'enumAttr',
                'attrName': {
                  'tag': 2,
                  'loc': {
                    'start': {
                      'line': 3,
                      'column': 13
                    },
                    'end': {
                      'line': 3,
                      'column': 18
                    }
                  },
                  'lexeme': 'value',
                  'index': 8
                },
                'attrValue': {
                  'type': 'string',
                  'value': {
                    'tag': 1,
                    'loc': {
                      'start': {
                        'line': 3,
                        'column': 20
                      },
                      'end': {
                        'line': 3,
                        'column': 23
                      }
                    },
                    'string': 'str',
                    'index': 10
                  },
                  'loc': {
                    'start': {
                      'line': 3,
                      'column': 20
                    },
                    'end': {
                      'line': 3,
                      'column': 23
                    }
                  }
                }
              },
              {
                'type': 'enumAttr',
                'attrName': {
                  'tag': 2,
                  'loc': {
                    'start': {
                      'line': 3,
                      'column': 26
                    },
                    'end': {
                      'line': 3,
                      'column': 37
                    }
                  },
                  'lexeme': 'description',
                  'index': 12
                },
                'attrValue': {
                  'type': 'string',
                  'value': {
                    'tag': 1,
                    'loc': {
                      'start': {
                        'line': 3,
                        'column': 39
                      },
                      'end': {
                        'line': 3,
                        'column': 42
                      }
                    },
                    'string': 'str',
                    'index': 14
                  },
                  'loc': {
                    'start': {
                      'line': 3,
                      'column': 39
                    },
                    'end': {
                      'line': 3,
                      'column': 42
                    }
                  }
                }
              }
            ],
            'tokenRange': [
              6,
              16
            ]
          }
        ],
        'tokenRange': [
          5,
          17
        ]
      },
      'tokenRange': [
        1,
        17
      ],
      'annotation': undefined
    });
  });

  it('number enum should ok', function () {
    var ast = parse(`
      enum E: number {
        num(value=12, description='num'),
      }
    `, '__filename');
    let [enumAst] = ast.moduleBody.nodes;
    expect(enumAst).to.be.eql({
      'type': 'enum',
      'enumName': {
        'tag': 2,
        'loc': {
          'start': {
            'line': 2,
            'column': 12
          },
          'end': {
            'line': 2,
            'column': 13
          }
        },
        'lexeme': 'E',
        'index': 2
      },
      'enumType': {
        'tag': 8,
        'loc': {
          'start': {
            'line': 2,
            'column': 15
          },
          'end': {
            'line': 2,
            'column': 21
          }
        },
        'lexeme': 'number',
        'index': 4
      },
      'enumBody': {
        'type': 'enumBody',
        'nodes': [
          {
            'type': 'enumField',
            'fieldName': {
              'tag': 2,
              'loc': {
                'start': {
                  'line': 3,
                  'column': 9
                },
                'end': {
                  'line': 3,
                  'column': 12
                }
              },
              'lexeme': 'num',
              'index': 6
            },
            'enumAttrs': [
              {
                'type': 'enumAttr',
                'attrName': {
                  'tag': 2,
                  'loc': {
                    'start': {
                      'line': 3,
                      'column': 13
                    },
                    'end': {
                      'line': 3,
                      'column': 18
                    }
                  },
                  'lexeme': 'value',
                  'index': 8
                },
                'attrValue': {
                  'type': 'number',
                  'value': {
                    'tag': 9,
                    'loc': {
                      'start': {
                        'line': 3,
                        'column': 19
                      },
                      'end': {
                        'line': 3,
                        'column': 21
                      }
                    },
                    'value': 12,
                    'type': 'integer',
                    'index': 10
                  },
                  'loc': {
                    'start': {
                      'line': 3,
                      'column': 19
                    },
                    'end': {
                      'line': 3,
                      'column': 21
                    }
                  }
                }
              },
              {
                'type': 'enumAttr',
                'attrName': {
                  'tag': 2,
                  'loc': {
                    'start': {
                      'line': 3,
                      'column': 23
                    },
                    'end': {
                      'line': 3,
                      'column': 34
                    }
                  },
                  'lexeme': 'description',
                  'index': 12
                },
                'attrValue': {
                  'type': 'string',
                  'value': {
                    'tag': 1,
                    'loc': {
                      'start': {
                        'line': 3,
                        'column': 36
                      },
                      'end': {
                        'line': 3,
                        'column': 39
                      }
                    },
                    'string': 'num',
                    'index': 14
                  },
                  'loc': {
                    'start': {
                      'line': 3,
                      'column': 36
                    },
                    'end': {
                      'line': 3,
                      'column': 39
                    }
                  }
                }
              }
            ],
            'tokenRange': [
              6,
              16
            ]
          }
        ],
        'tokenRange': [
          5,
          17
        ]
      },
      'tokenRange': [
        1,
        17
      ],
      annotation: undefined
    });
  });

  it('other type enum should not ok', function () {
    expect(() => {
      parse(`
      enum E: boolean {
        str(value=true, description='str'),
      }
    `, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      console.log(e.message);
      expect(e.message).to.be('Unexpected token: Word: `true`. expect string or number');
    });
  });

  it('enum has no attr should not ok', function () {
    expect(() => {
      parse(`
      enum E: string {
        str,
      }
    `, '__filename');
    }).to.throwException(function (e) { // get the exception object
      expect(e).to.be.a(SyntaxError);
      console.log(e.message);
      expect(e.message).to.be('Unexpected token: ,. Expect (, but ,');
    });
  });

  it('number/new/super/rpc/extends filed get/set should ok', function () {
    expect(() => {
      parse(`model M{
        number: number,
        super: number,
        rpc: number,
        new: number,
        extends: number,
        object: number,
      }

      static function main(str: [string]): void {
        var m = new M{
          number = 123,
          super = 123,
          rpc = 123,
          new = 123,
          extends = 123,
          object = 123
        };
        var number = m.number;
        var super = m.super;
        var rpc = m.rpc;
        var new = m.new;
        var object = m.object;
        var extends = m.extends;
      }`, '__filename');
    }).to.not.throwException();
  });

  it('typedef should ok', function () {
    var ast = parse(`
      typedef HttpRequest;
    `, '__filename');
    let [enumAst] = ast.moduleBody.nodes;
    expect(enumAst).to.be.eql({
      'type': 'typedef',
      'value': {
        'tag': 2,
        'loc': {
          'end': {
            'column': 26,
            'line': 2
          },
          'start': {
            'column': 15,
            'line': 2
          }
        },
        'lexeme': 'HttpRequest',
        'index': 2
      },
      'tokenRange': [1, 3],
      'annotation': undefined
    });
  });
});
