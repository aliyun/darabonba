'use strict';

const assert = require('assert');
const debug = require('debug')('dara:analyser:interface');

class Analyser extends require('./common_analyser') {
  constructor(ctx, pkg) {
    super(ctx, pkg);
    // 初始化其他内部状态
    this.methods = new Map();
    this.name = '';
  }

  check(ast) {
    assert.strictEqual(ast.type, 'interface');
    debug(`start pre analyse module: ${this.filename}`);
    this.name = ast.name.lexeme;
    this.checkImports(ast);
    // instance properties
    this.preCheckMethods(ast);
    this.prechecked = true;
  }

  preCheckMethods(ast) {
    // checkpoint: 不能重复定义 function
    ast.interfaceBody.nodes.forEach((node) => {
      const key = node.functionName.lexeme;
      // 重复定义检查
      if (this.methods.has(key)) {
        this.error(`redefined function '${key}'`, node.functionName);
      }

      this.methods.set(key, node);
    });
  }

  checkMethods(ast) {
    assert.strictEqual(this.prechecked, true, 'must pre-check before check methods');
    debug(`start post analyse module: ${this.filename}`);
    ast.interfaceBody.nodes.forEach((item) => {
      this.visitFunction(item);
    });
  }
}

module.exports = Analyser;
