'use strict';

const assert = require('assert');

const {
  Token, StringLiteral, NumberLiteral, Annotation, Comment,
  TemplateElement, WordToken, LogicalToken, OperatorToken
} = require('../lib/tokens');

describe('tokens', function () {
  it('Token should ok', function () {
    const t = new Token('s');
    assert.deepStrictEqual(t.toString(), 's');
  });

  it('StringLiteral should ok', function () {
    const t = new StringLiteral('s');
    assert.deepStrictEqual(t.toString(), 'String: s');
  });

  it('NumberLiteral should ok', function () {
    const t = new NumberLiteral('s');
    assert.deepStrictEqual(t.toString(), 'Number: s');
  });

  it('Annotation should ok', function () {
    const t = new Annotation('s');
    assert.deepStrictEqual(t.toString(), 'Annotation: s');
  });

  it('Comment should ok', function () {
    const t = new Comment('s');
    assert.deepStrictEqual(t.toString(), 'Comment: s');
  });

  it('TemplateElement should ok', function () {
    const t = new TemplateElement('s');
    assert.deepStrictEqual(t.toString(), 'TemplateElement: `s`');
  });

  it('WordToken should ok', function () {
    const t = new WordToken(1, 's');
    assert.deepStrictEqual(t.toString(), 'Word: `s`');
  });

  it('OperatorToken should ok', function () {
    const t = new OperatorToken('<');
    assert.deepStrictEqual(t.toString(), 'Operator: `<`');
  });

  it('LogicalToken should ok', function () {
    const t = new LogicalToken('&&');
    assert.deepStrictEqual(t.toString(), 'Logical: `&&`');
  });

});