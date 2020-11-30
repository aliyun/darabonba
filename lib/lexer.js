'use strict';

const {
  Tag
} = require('./tag');
const Keyword = require('./keyword');

const BaseLexer = require('./base_lexer');

const {
  Token,
  StringLiteral,
  NumberLiteral,
  Annotation,
  Comment,
  TemplateElement,
  WordToken,
  LogicalToken,
  OperatorToken
} = require('./tokens');

function isLetter(c) {
  if (typeof c !== 'string') {
    return false;
  }
  // letter = "A" … "Z" | "a" … "z"
  var code = c.charCodeAt(0);
  return (code >= 0x41 && code <= 0x5a ||
        code >= 0x61 && code <= 0x7a);
}

function isDecimalDigit(c) {
  if (typeof c !== 'string') {
    return false;
  }
  // decimalDigit = "0" … "9"
  var code = c.charCodeAt(0);
  return code >= 0x30 && code <= 0x39;
}

class Lexer extends BaseLexer {
  constructor(source, filename) {
    super(source, filename);
    this.reserve(new Keyword('module', Tag.MODULE));
    this.reserve(new Keyword('model', Tag.MODEL));
    this.reserve(new Keyword('import', Tag.IMPORT));
    this.reserve(new Keyword('extends', Tag.EXTENDS));
    this.reserve(new Keyword('super', Tag.SUPER));
    this.reserve(new Keyword('interface', Tag.INTERFACE));
    this.reserve(new Keyword('implements', Tag.IMPLEMENTS));
    this.reserve(new Keyword('const', Tag.CONST));
    this.reserve(new Keyword('static', Tag.STATIC));
    // data types
    this.reserve(new Keyword('class', Tag.TYPE));
    this.reserve(new Keyword('void', Tag.TYPE));
    this.reserve(new Keyword('string', Tag.TYPE));
    this.reserve(new Keyword('integer', Tag.TYPE));
    this.reserve(new Keyword('int8', Tag.TYPE));
    this.reserve(new Keyword('int16', Tag.TYPE));
    this.reserve(new Keyword('int32', Tag.TYPE));
    this.reserve(new Keyword('int64', Tag.TYPE));
    this.reserve(new Keyword('long', Tag.TYPE));
    this.reserve(new Keyword('uint8', Tag.TYPE));
    this.reserve(new Keyword('uint16', Tag.TYPE));
    this.reserve(new Keyword('uint32', Tag.TYPE));
    this.reserve(new Keyword('uint64', Tag.TYPE));
    this.reserve(new Keyword('ulong', Tag.TYPE));
    this.reserve(new Keyword('float', Tag.TYPE));
    this.reserve(new Keyword('double', Tag.TYPE));
    this.reserve(new Keyword('boolean', Tag.TYPE));
    this.reserve(new Keyword('bytes', Tag.TYPE));
    this.reserve(new Keyword('any', Tag.TYPE));
    this.reserve(new Keyword('map', Tag.TYPE));
    this.reserve(new Keyword('writable', Tag.TYPE));
    this.reserve(new Keyword('readable', Tag.TYPE));
    // boolean
    this.reserve(new Keyword('true', Tag.BOOL));
    this.reserve(new Keyword('false', Tag.BOOL));
    // null
    this.reserve(new Keyword('null', Tag.NULL));

    this.reserve(new Keyword('if', Tag.IF));
    this.reserve(new Keyword('else', Tag.ELSE));
    this.reserve(new Keyword('return', Tag.RETURN));
    this.reserve(new Keyword('throw', Tag.THROW));
    this.reserve(new Keyword('while', Tag.WHILE));
    this.reserve(new Keyword('for', Tag.FOR));
    this.reserve(new Keyword('of', Tag.OF));
    this.reserve(new Keyword('break', Tag.BREAK));
    this.reserve(new Keyword('var', Tag.VAR));

    // module
    this.reserve(new Keyword('new', Tag.NEW));

    // try/catch/finally
    this.reserve(new Keyword('try', Tag.TRY));
    this.reserve(new Keyword('catch', Tag.CATCH));
    this.reserve(new Keyword('finally', Tag.FINALLY));

    // to
    this.reserve(new Keyword('to', Tag.TO));
    // the state for template string
    this.inTemplate = false;

    this.tokenIndex = 0;
    this.comments = new Map();
  }

  error(message) {
    console.error(`${this.filename}:${this.line}:${this.column}`);
    console.error(`${this.source.split('\n')[this.line - 1]}`);
    console.error(`${' '.repeat(this.column - 1)}^`);
    throw new SyntaxError(message);
  }

  loc() {
    return {
      line: this.line,
      column: this.column
    };
  }

  parseString() {
    var quote = this.peek;
    let str = '';
    this.getch();
    let start = this.loc();
    var end;
    for (; ;) {
      if (this.peek === quote) {
        end = this.loc();
        this.getch();
        break;
      }

      var c = this.peek;
      if (this.peek === '\\') {
        this.getch();
        switch (this.peek) { // 解析转义字符
        case '0':
          c = '\0';
          break;
        case 'b':
          c = '\b';
          break;
        case 't':
          c = '\t';
          break;
        case 'n':
          c = '\n';
          break;
        case 'v':
          c = '\v';
          break;
        case 'f':
          c = '\f';
          break;
        case 'r':
          c = '\r';
          break;
        case '\'':
          c = '\'';
          break;
        case '\\':
          c = '\\';
          break;
        default:
          this.error(`Invalid char: \\0x${this.peek}/'\\0x${this.peek.charCodeAt(0)}'`);
        }
        str += c;
        this.getch();
      } else if (this.peek) {
        str += this.peek;
        this.getch();
      } else {
        this.error('Unexpect end of file');
      }
    }

    return new StringLiteral(str, {
      start, end
    }, this.tokenIndex++);
  }

  parseTemplateString() {
    this.getch();
    var tpl = '';
    let start = this.loc();
    while (this.peek) {
      if (this.peek === '$') {
        if (this.readch(1) === '{') {
          let end = this.loc();
          // consume the '${'
          this.getch();
          this.getch();
          return new TemplateElement(tpl, false, {
            start, end
          }, this.tokenIndex++);
        }
      }

      if (this.peek === '`') {
        let end = this.loc();
        this.inTemplate = false;
        this.getch();
        return new TemplateElement(tpl, true, {
          start, end
        }, this.tokenIndex++);
      }

      tpl += this.peek;
      this.getch();
    }

    this.error('Unexpect end of file');
  }

  decimalLit() {
    let v = '';
    if (isDecimalDigit(this.peek)) {
      do {
        v += this.peek;
        this.getch();
      } while (isDecimalDigit(this.peek));
    }
    return v;
  }

  optionalFraction() {
    let v = '';
    if (this.peek === '.' && isDecimalDigit(this.readch(1))) {
      v += this.peek;
      this.getch();
      v += this.decimalLit();
    }
    return v;
  }

  parseNumber() {
    let start = this.loc();
    let v = '';
    let type = 'integer';
    if (this.peek === '-') { //optionalSign
      v += '-';
      this.getch();
    }

    v += this.decimalLit();
    let fraction = this.optionalFraction();
    if (fraction) {
      type = 'float';
    }
    v += fraction;
    //optionalType
    if (this.peek === 'f') {
      this.getch();
      type = 'float';
    } else if (this.peek === 'd') {
      this.getch();
      type = 'double';
    } else if (this.peek === 'L') {
      this.getch();
      type = 'long';
    }

    return new NumberLiteral(v, type, {
      start,
      end: this.loc()
    }, this.tokenIndex++);
  }

  scan() {
    this.skipWhitespaces();
    let start = this.loc();
    if (this.peek === '/') {
      if (this.readch(1) === '/') {
        // consume the //
        this.getch();
        this.getch();
        // comments
        let str = '//';
        while (this.peek !== '\n' && this.peek) {
          str += this.peek;
          this.getch();
        }

        const comment = new Comment(str, {
          start: start,
          end: this.loc()
        }, this.tokenIndex++);
        this.comments.set(this.tokenIndex, comment);
        return comment;
      }

      if (this.readch(1) === '*' && this.readch(2) === '*') {
        // consume the /**
        this.getch();
        this.getch();
        this.getch();
        let str = '/**';
        do {
          str += this.peek;
          this.getch();
        } while (!(this.peek === '*' && this.readch(1) === '/')); // ends with '*/'
        // consume */
        str += '*/';
        this.getch();
        this.getch();
        return new Annotation(str, {
          start: start,
          end: this.loc()
        }, this.tokenIndex++);
      }

      this.error(`Only '//' or '/**' allowed`);
    }

    if (this.inTemplate) {
      if (this.peek === '}') {
        let str = '';
        this.getch();
        let start = this.loc();
        while (this.peek) {
          if (this.peek === '$') {
            if (this.readch(1) === '{') {
              let end = this.loc();
              // consume '${'
              this.getch();
              this.getch();
              return new TemplateElement(str, false, {
                start, end
              }, this.tokenIndex++);
            }
          }

          if (this.peek === '`') {
            let end = this.loc();
            this.inTemplate = false;
            this.getch();
            return new TemplateElement(str, true, {
              start, end
            }, this.tokenIndex++);
          }

          str += this.peek;
          this.getch();
        }

        this.error('Unexpect end of file');
      }
    }

    switch (this.peek) {
    case '\'':
    case '"':
      return this.parseString();
    case '`': {
      this.inTemplate = true;
      return this.parseTemplateString();
    }
    case '@':
    case '$':
    case '#':
      return this.parsePrefixId();
    }

    // number  = optionalSign decimalLit optionalFraction optionalType
    // optionalFraction = .decimalLit | ε
    // decimalLit = decimalDigit { decimalDigit }
    // optionalType = "L" | "f" | "d" | ε
    // decimalDigit = "0" … "9"
    // optionalSign = "-" | ε
    if (isDecimalDigit(this.peek) || this.peek === '-') {
      return this.parseNumber();
    }

    if (isLetter(this.peek) || this.peek === '_') {
      let str = '';
      do {
        str += this.peek;
        this.getch();
      } while (isLetter(this.peek) ||
            isDecimalDigit(this.peek) ||
            this.peek === '_');

      // reserve words
      if (this.words.has(str)) {
        var keyword = this.words.get(str);
        return new WordToken(keyword.tag, keyword.lexeme, {
          start: start,
          end: this.loc()
        }, this.tokenIndex++);
      }

      return new WordToken(Tag.ID, str, {
        start: start,
        end: this.loc()
      }, this.tokenIndex++);
    }

    if (this.peek === '&') {
      this.getch();
      if (this.peek === '&') {
        this.getch();
        return new LogicalToken('&&', {
          start,
          end: this.loc()
        }, this.tokenIndex++);
      }

      this.error(`Unexpect ${this.peek} after '&', expect '&'`);
    }

    if (this.peek === '|') {
      this.getch();
      if (this.peek === '|') {
        this.getch();
        return new LogicalToken('||', {
          start,
          end: this.loc()
        }, this.tokenIndex++);
      }

      this.error(`Unexpect ${this.peek} after '|', expect '|'`);
    }

    if (this.peek === '<') {
      this.getch();
      if (this.peek === '=') {
        this.getch();
        return new OperatorToken('<=', {
          start,
          end: this.loc()
        }, this.tokenIndex++);
      }

      return new OperatorToken('<', {
        start,
        end: this.loc()
      }, this.tokenIndex++);
    }

    if (this.peek === '>') {
      this.getch();
      if (this.peek === '=') {
        this.getch();
        return new OperatorToken('>=', {
          start,
          end: this.loc()
        }, this.tokenIndex++);
      }

      return new OperatorToken('>', {
        start,
        end: this.loc()
      }, this.tokenIndex++);
    }

    var tok = new Token(this.peek, {
      start,
      end: this.loc()
    }, this.tokenIndex++);
    this.peek = ' ';
    return tok;
  }

  parsePrefixId() {
    let start = this.loc();
    const prefix = this.peek;
    let str = '';
    this.getch();

    if (!isLetter(this.peek)) {
      this.error(`Unexpect ${this.peek} after ${prefix}`);
    }

    do {
      str += this.peek;
      this.getch();
    } while (isLetter(this.peek) ||
        isDecimalDigit(this.peek) ||
            this.peek === '_');
    
    let type;
    switch (prefix) {
    case '@':
      type = Tag.VID;
      break;
    case '$':
      type = Tag.PACK_ID;
      break;
    case '#':
      type = Tag.INLINE_ID;
      break;
    }

    return new WordToken(type, `${prefix}${str}`, {
      start,
      end: this.loc()
    }, this.tokenIndex++);
  }
}

module.exports = Lexer;