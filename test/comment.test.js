'use strict';

const expect = require('expect.js');

const comment = require('../lib/comment');
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

describe('comment util', function () {
  let comments = {};
  let model = {};

  before(function () {
    let ast = parse(`
    // front model comment one
    // front model comment two
    model M{
      // empty model one
      // empty model two
    }
    // back model comment one
    // back model comment two
    `, '__filename');
    comments = ast.comments;
    [model] = ast.moduleBody.nodes;
  });

  it('get model front comment should be ok', function () {
    expect(comment.getFrontComments(comments, model.tokenRange[0])).to.eql([{
      'index': 1,
      'loc': loc(2, 5, 2, 31),
      'value': '// front model comment one',
      'tag': 20
    }, {
      'index': 2,
      'loc': loc(3, 5, 3, 31),
      'value': '// front model comment two',
      'tag': 20
    }]);
  });

  it('get comment in model body should be', function () {
    expect(comment.getBetweenComments(comments, model.tokenRange[0], model.tokenRange[1])).to.eql([{
      'index': 6,
      'loc': loc(5, 7, 5, 25),
      'value': '// empty model one',
      'tag': 20
    }, {
      'index': 7,
      'loc': loc(6, 7, 6, 25),
      'value': '// empty model two',
      'tag': 20
    }]);
  });

  it('get comment behind model should be', function () {
    expect(comment.getBackComments(comments, model.tokenRange[1])).to.eql([{
      'index': 9,
      'loc': loc(8, 5, 8, 30),
      'value': '// back model comment one',
      'tag': 20
    }, {
      'index': 10,
      'loc': loc(9, 5, 9, 30),
      'value': '// back model comment two',
      'tag': 20
    }]);
  });
});
