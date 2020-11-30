'use strict';

class BaseLexer {
  constructor(source, filename, offset = {}) {
    this.source = source;
    this.filename = filename;

    this.index = offset.index || -1;
    this.peek = ' ';
    this.words = new Map();
    this.line = offset.line || 1;
    this.column = offset.column || 0;
  }

  // read and consume a char
  getch() {
    if (this.peek === '\n') {
      // line number
      this.line++;
      this.column = 0;
    }
    this.index++;
    this.column++;
    this.peek = this.source[this.index]; // 其它返回实际字节值
  }

  // read a char by offset
  readch(i = 0) {
    // 只读取，不消费
    return this.source[this.index + i];
  }

  ungetch() {
    this.index--;
    this.column--;
    this.peek = this.source[this.index]; // 其它返回实际字节值
  }

  reserve(word) {
    if (this.words.has(word.lexeme)) {
      throw new Error(`duplicate reserved word: ${word.lexeme}`);
    }
    this.words.set(word.lexeme, word);
  }

  skipWhitespaces() {
    // 忽略空格,和TAB ch =='\n'
    while (this.peek === ' ' || this.peek === '\t' ||
      this.peek === '\n' || this.peek === '\r') {
      this.getch();
    }
  }
}

module.exports = BaseLexer;
