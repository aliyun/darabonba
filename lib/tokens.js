'use strict';

import { Tag } from './tag.js';
import { Token } from './skyline/token.js';

export class StringLiteral extends Token {
  constructor(string, loc) {
    super(Tag.STRING, loc);
    this.string = string;
  }

  toString() {
    return `String: ${this.string}`;
  }
}

export class NumberLiteral extends Token {
  constructor(value, type,loc) {
    super(Tag.NUMBER, loc);
    this.value = value;
    this.type = type;
  }

  toString() {
    return `Number: ${this.value}`;
  }
}

export class Annotation extends Token {
  constructor(value, loc) {
    super(Tag.ANNOTATION, loc);
    this.value = value;
  }

  toString() {
    return `Annotation: ${this.value}`;
  }
}

export class Comment extends Token {
  constructor(value, loc) {
    super(Tag.COMMENT, loc);
    this.value = value;
  }

  toString() {
    return `Comment: ${this.value}`;
  }
}

export class TemplateElement extends Token {
  constructor(value, isTail, loc) {
    super(Tag.TEMPLATE, loc);
    this.string = value;
    this.tail = isTail;
  }

  toString() {
    return `TemplateElement: \`${this.string}\``;
  }
}

export class WordToken extends Token {
  constructor(tag, lexeme, loc) {
    super(tag, loc);
    this.lexeme = lexeme;
  }

  toString() {
    return `Word: \`${this.lexeme}\``;
  }
}

export class OperatorToken extends Token {
  constructor(tag, lexeme, loc) {
    super(tag, loc);
    this.lexeme = lexeme;
  }

  toString() {
    return `Operator: \`${this.lexeme}\``;
  }
}
