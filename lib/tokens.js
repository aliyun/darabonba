'use strict';

const {
  Tag
} = require('./tag');

class Token {
  constructor(tag, loc, index) {
    this.tag = tag;
    this.loc = loc;
    this.index = index;
  }

  toString() {
    return `${this.tag}`;
  }
}

class StringLiteral extends Token {
  constructor(string, loc, index) {
    super(Tag.STRING, loc, index);
    this.string = string;
  }

  toString() {
    return `String: ${this.string}`;
  }
}

class NumberLiteral extends Token {
  constructor(value, type, loc, index) {
    super(Tag.NUMBER, loc, index);
    this.value = value;
    this.type = type;
  }

  toString() {
    return `Number: ${this.value}`;
  }
}

class Annotation extends Token {
  constructor(value, loc, index) {
    super(Tag.ANNOTATION, loc, index);
    this.value = value;
  }

  toString() {
    return `Annotation: ${this.value}`;
  }
}

class Comment extends Token {
  constructor(value, loc, index) {
    super(Tag.COMMENT, loc, index);
    this.value = value;
  }

  toString() {
    return `Comment: ${this.value}`;
  }
}

class TemplateElement extends Token {
  constructor(value, isTail, loc, index) {
    super(Tag.TEMPLATE, loc, index);
    this.string = value;
    this.tail = isTail;
  }

  toString() {
    return `TemplateElement: \`${this.string}\``;
  }
}

class WordToken extends Token {
  constructor(tag, lexeme, loc, index) {
    super(tag, loc, index);
    this.lexeme = lexeme;
  }

  toString() {
    return `Word: \`${this.lexeme}\``;
  }
}

class LogicalToken extends Token {
  constructor(lexeme, loc, index) {
    super(Tag.LOGICAL, loc, index);
    this.lexeme = lexeme;
  }

  toString() {
    return `Logical: \`${this.lexeme}\``;
  }
}

class OperatorToken extends Token {
  constructor(lexeme, loc, index) {
    super(Tag.OPERATOR, loc, index);
    this.lexeme = lexeme;
  }

  toString() {
    return `Operator: \`${this.lexeme}\``;
  }
}

module.exports = {
  Token,
  StringLiteral,
  NumberLiteral,
  Annotation,
  Comment,
  TemplateElement,
  WordToken,
  LogicalToken,
  OperatorToken
};