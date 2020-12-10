'use strict';

const {
  isLetter, isDecimalDigit
} = require('./helper');

const {
  Tag
} = require('./tag');
const Keyword = require('./keyword');

const {
  Lexer: BaseLexer,
  Token
} = require('@jacksontian/skyline');

const {
  StringLiteral,
  NumberLiteral,
  Annotation,
  Comment,
  TemplateElement,
  WordToken,
  OperatorToken
} = require('./tokens');

class Lexer extends BaseLexer {
  constructor(source, filename) {
    super(source, filename);
    this.reserve(new Keyword('import', Tag.IMPORT));
    this.reserve(new Keyword('extends', Tag.EXTENDS));
    this.reserve(new Keyword('super', Tag.SUPER));
    this.reserve(new Keyword('const', Tag.CONST));
    this.reserve(new Keyword('rpc', Tag.RPC));
    this.reserve(new Keyword('static', Tag.STATIC));
    // data types
    this.reserve(new Keyword('class', Tag.TYPE));
    this.reserve(new Keyword('void', Tag.TYPE));
    this.reserve(new Keyword('string', Tag.TYPE));
    this.reserve(new Keyword('number', Tag.TYPE));
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
    this.reserve(new Keyword('object', Tag.TYPE));
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
    this.reserve(new Keyword('break', Tag.BREAK));

    this.reserve(new Keyword('var', Tag.VAR));

    // module
    this.reserve(new Keyword('new', Tag.NEW));

    // try/catch/finally
    this.reserve(new Keyword('try', Tag.TRY));
    this.reserve(new Keyword('catch', Tag.CATCH));
    this.reserve(new Keyword('finally', Tag.FINALLY));

    // the state for template string
    this.inTemplate = false;
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
        case '"':
          c = '"';
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
    });
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
          });
        }
      }

      if (this.peek === '`') {
        let end = this.loc();
        this.inTemplate = false;
        this.getch();
        return new TemplateElement(tpl, true, {
          start, end
        });
      }

      tpl += this.peek;
      this.getch();
    }

    this.error('Unexpect end of file');
  }

  decimalLit() {
    let v = '';
    if(isDecimalDigit(this.peek)){
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
      return new NumberLiteral(parseFloat(v), type, {
        start,
        end: this.loc()
      });
    } else if (this.peek === 'd') {
      this.getch();
      type = 'double';
      return new NumberLiteral(parseFloat(v), type, {
        start,
        end: this.loc()
      });
    } else if (this.peek === 'L') {
      this.getch();
      type = 'long';
      return new NumberLiteral(parseInt(v), type, {
        start,
        end: this.loc()
      });
    } 
    if (type === 'integer') {
      return new NumberLiteral(parseInt(v), type, {
        start,
        end: this.loc()
      });
    } 
    return new NumberLiteral(parseFloat(v), type, {
      start,
      end: this.loc()
    });
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

        return new Comment(str, {
          start: start,
          end: this.loc()
        });
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
        });
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
              });
            }
          }

          if (this.peek === '`') {
            let end = this.loc();
            this.inTemplate = false;
            this.getch();
            return new TemplateElement(str, true, {
              start, end
            });
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

    if (isLetter(this.peek) || this.peek === '_' ||
      this.peek === '$') {
      let str = '';
      do {
        str += this.peek;
        this.getch();
      } while (isLetter(this.peek) ||
      isDecimalDigit(this.peek) ||
      this.peek === '_' ||
        this.peek === '-');

      // reserve words
      if (this.words.has(str)) {
        var keyword = this.words.get(str);
        return new WordToken(keyword.tag, keyword.lexeme, {
          start: start,
          end: this.loc()
        });
      }

      return new WordToken(Tag.ID, str, {
        start: start,
        end: this.loc()
      });
    }

    if (this.peek === '@') {
      return this.parseVID();
    }

    if (this.peek === '&') {
      this.getch();
      if (this.peek === '&') {
        this.getch();
        return new OperatorToken(Tag.AND, '&&', {
          start,
          end: this.loc()
        });
      }

      this.error(`Unexpect ${this.peek} after '&', expect '&'`);
    }

    if (this.peek === '|') {
      this.getch();
      if (this.peek === '|') {
        this.getch();
        return new OperatorToken(Tag.OR, '||', {
          start,
          end: this.loc()
        });
      }

      this.error(`Unexpect ${this.peek} after '|', expect '|'`);
    }

    var tok = new Token(this.peek, {
      start,
      end: this.loc()
    });
    this.peek = ' ';
    return tok;
  }

  parseVID() {
    let start = this.loc();
    let str = '@';
    this.getch();

    if (!isLetter(this.peek)) {
      this.error(`Unexpect ${this.peek} after @`);
    }

    do {
      str += this.peek;
      this.getch();
    } while (isLetter(this.peek) ||
    isDecimalDigit(this.peek) ||
      this.peek === '_');

    return new WordToken(Tag.VID, str, {
      start,
      end: this.loc()
    });
  }
}

module.exports = Lexer;
