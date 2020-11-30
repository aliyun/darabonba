'use strict';

const assert = require('assert');
const debug = require('debug')('dara:analyser:main');

const Env = require('./env');

class Analyser extends require('./common_analyser') {
  constructor(ctx, pkg) {
    super(ctx, pkg);
    // 初始化其他内部状态
    this.methods = new Map();
    // prechecked status
    this.prechecked = false;
  }

  check(ast) {
    assert.strictEqual(ast.type, 'main');
    debug(`start pre analyse main: ${this.filename}`);
    this.checkImports(ast);
    this.preCheckMethods(ast);
    this.prechecked = true;
  }

  preCheckMethods(ast) {
    // checkpoint: 不能重复定义 function
    ast.mainBody.nodes.forEach((node) => {
      if (node.type === 'function') {
        const key = node.functionName.lexeme;
        // 重复定义检查
        if (this.methods.has(key)) {
          this.error(`redefined function '${key}'`, node.functionName);
        }

        this.methods.set(key, node);
      }
    });

    const entries = ast.mainBody.nodes.filter((node) => {
      return node.type === 'main';
    });

    if (entries.length > 1) {
      this.error(`only one entry is allowed`, entries[1].main);
    }
  }

  visitMain(ast) {
    assert.equal(ast.type, 'main');
    const env = new Env();
    this.visitParams(ast.params, env);
    // this.checkType(ast.returnType);

    if (ast.functionBody) {
      const ctx = {
        returnType: {type: 'basic', name: 'void'},
        isStatic: ast.isStatic,
        isAsync: ast.isAsync,
        local: env,
        variables: new Map()
      };
      assert.equal(ast.functionBody.type, 'functionBody');
      this.visitStmts(ast.functionBody.stmts, ctx);
      // checkpoint: 检查是否有 return statement
      this.checkReturnStmt(ast.functionBody.stmts, ctx, ast.main);
      this.checkUnreachableCode(ast.functionBody.stmts);
      this.checkUnusedVariable(ctx.variables);
    }
  }

  checkMethods(ast) {
    assert.strictEqual(this.prechecked, true, 'must pre-check before check methods');
    debug(`start post analyse module: ${this.filename}`);
    ast.mainBody.nodes.forEach((item) => {
      if (item.type === 'function') {
        this.visitFunction(item);
      } else {
        this.visitMain(item);
      }
    });
  }
}

module.exports = Analyser;
