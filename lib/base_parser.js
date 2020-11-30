'use strict';

const { Tag, tip } = require('./tag');

class Parser {
  constructor(lexer) {
    this.lexer = lexer;
    this.look = null;
  }

  move() {
    do {
      this.look = this.lexer.scan();
    } while (this.look.tag === Tag.COMMENT);
  }

  tagTip(tag) {
    return tip(tag);
  }

  getIndex() {
    return this.look.index;
  }

  imports() {
    var imports = [];

    while (this.is(Tag.IMPORT)) {
      const begin = this.getIndex();
      this.move();
      const aliasId = this.look;
      this.match(Tag.PACK_ID);
      this.match(';');
      let end = this.getIndex();

      imports.push({
        type: 'import',
        aliasId: aliasId,
        tokenRange: [begin, end]
      });
    }

    return imports;
  }

  externComponent() {
    const begin = this.getIndex();
    let t = this.look;
    this.move();
    // for $A.B
    this.match('.');
    const id = this.look;
    this.match(Tag.ID);
    const end = this.getIndex();
    return {
      type: 'extern_component',
      aliasId: t,
      component: id,
      loc: {
        start: t.loc.start,
        end: id.loc.end
      },
      tokenRange: [begin, end]
    };
  }

  baseType() {
    if (this.look.tag === '[') {
      this.move();
      const t = this.baseType();
      this.match(']');
      return {
        type: 'array',
        itemType: t
      };
    }

    if (this.isWord(Tag.TYPE, 'map')) {
      let t = this.look;
      this.move();
      this.match('[');
      const keyType = this.baseType();
      this.match(']');
      const valueType = this.baseType();
      return {
        loc: {
          start: t.loc.start,
          end: valueType.loc.end
        },
        type: 'map',
        keyType: keyType,
        valueType: valueType
      };
    }

    if (this.is(Tag.ID)) {
      var t = this.look;
      this.move();
      return t;
    }

    if (this.is(Tag.PACK_ID)) {
      return this.externComponent();
    }

    if (this.is(Tag.TYPE)) {
      let t = this.look;
      this.move();
      return t;
    }

    this.error(`expect base type, model id or array form`);
  }

  match(tag) {
    if (this.look.tag === tag) {
      this.move();
    } else {
      this.error(`Expect ${this.tagTip(tag)}, but ${this.tokenTip(this.look)}`);
    }
  }

  matchWord(tag, lexeme) {
    if (this.look.tag === tag && this.look.lexeme === lexeme) {
      this.move();
    } else {
      this.error(`Expect ${this.tagTip(tag)} ${lexeme}, but ${this.tokenTip(this.look)}`);
    }
  }

  is(tag) {
    return this.look.tag === tag;
  }

  isWord(tag, lexeme) {
    return this.look.tag === tag && this.look.lexeme === lexeme;
  }

  tokenTip(token) {
    if (!token.tag) {
      return 'EOF';
    }

    return this.look;
  }

  error(message) {
    const lexer = this.lexer;
    const token = this.look;
    console.log(`${lexer.filename}:${token.loc.start.line}:${token.loc.start.column}`);
    console.log(`${lexer.source.split('\n')[token.loc.start.line - 1]}`);
    console.log(`${' '.repeat(token.loc.start.column - 1)}^`);
    const prefix = `Unexpected token: ${this.tokenTip(token)}.`;
    throw new SyntaxError(`${prefix} ${message}`);
  }
}

module.exports = Parser;
