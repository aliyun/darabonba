'use strict';

const {
  Tag
} = require('./tag');

const {
  Token
} = require('@jacksontian/skyline');

class StringLiteral extends Token {
  constructor(string, loc) {
    super(Tag.STRING, loc);
    this.string = string;
  }

  toString() {
    return `String: ${this.string}`;
  }
}

class NumberLiteral extends Token {
  constructor(value, type,loc) {
    super(Tag.NUMBER, loc);
    this.value = value;
    this.type = type;
  }

  toString() {
    return `Number: ${this.value}`;
  }
}

class Annotation extends Token {
  constructor(value, loc) {
    super(Tag.ANNOTATION, loc);
    this.value = value;
  }

  toString() {
    return `Annotation: ${this.value}`;
  }
}

class Comment extends Token {
  constructor(value, loc) {
    super(Tag.COMMENT, loc);
    this.value = value;
  }

  toString() {
    return `Comment: ${this.value}`;
  }
}

class TemplateElement extends Token {
  constructor(value, isTail, loc) {
    super(Tag.TEMPLATE, loc);
    this.string = value;
    this.tail = isTail;
  }

  toString() {
    return `TemplateElement: \`${this.string}\``;
  }
}

class WordToken extends Token {
  constructor(tag, lexeme, loc) {
    super(tag, loc);
    this.lexeme = lexeme;
  }

  toString() {
    return `Word: \`${this.lexeme}\``;
  }
}

class OperatorToken extends Token {
  constructor(tag, lexeme, loc) {
    super(tag, loc);
    this.lexeme = lexeme;
  }

  toString() {
    return `Operator: \`${this.lexeme}\``;
  }
}

module.exports = {
  StringLiteral,
  NumberLiteral,
  Annotation,
  Comment,
  TemplateElement,
  WordToken,
  OperatorToken
};
