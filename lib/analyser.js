'use strict';

const { Tag } = require('./tag');

class Analyser {
  constructor(file, pkg) {
    // 文件级别
    this.filename = file.filename;
    this.source = file.source;
    // 包级别
    this.pkg = pkg;
    // 初始化其他内部状态
    this.dependencies = new Map();
    // 计数器
    this.usedTypes = new Map();
    this.usedPackages = new Map();
    this.usedComponents = new Map();
    // used to flag $dara
    this.usedFeatures = new Map();
  }

  error(message, token) {
    if (token) {
      const loc = token.loc;
      console.error(`${this.filename}:${loc.start.line}:${loc.start.column}`);
      console.error(`${this.source.split('\n')[loc.start.line - 1]}`);
      console.error(`${' '.repeat(loc.start.column - 1)}^`);
    }

    throw new SyntaxError(message);
  }

  checkImports(ast) {
    if (ast.imports.length === 0) {
      return;
    }

    for (let i = 0; i < ast.imports.length; i++) {
      const item = ast.imports[i];
      const aliasId = item.aliasId.lexeme;

      // checkpoint: 检查是否在 Darafile 中声明外部包
      if (!this.pkg.libraries.has(aliasId)) {
        this.error(`the package '${aliasId}' not defined in Darafile`, item.aliasId);
      }

      // checkpoint: 不允许重复引入外部包
      if (this.dependencies.has(aliasId)) {
        this.error(`the package id '${aliasId}' has been imported`, item.aliasId);
      }

      this.dependencies.set(aliasId, this.pkg.libraries.get(aliasId));
      this.usedPackages.set(aliasId, new Map());
    }
  }

  checkType(ast) {
    if (ast.tag === Tag.TYPE) {
      this.usedTypes.set(ast.lexeme, true);
    } else if (ast.tag === Tag.ID) {
      // checkpoint: 只能是包内的 model/module
      if (!this.pkg.components.has(ast.lexeme)) {
        this.error(`the type '${ast.lexeme}' is undefined`, ast);
      }
      this.usedComponents.set(ast.lexeme, this.pkg.components.get(ast.lexeme));
    } else if (ast.type === 'array') {
      this.checkType(ast.itemType);
    } else if (ast.type === 'map') {
      this.checkType(ast.keyType);
      this.checkType(ast.valueType);
    } else if (ast.type === 'extern_component') {
      if (!this.dependencies.has(ast.aliasId.lexeme)) {
        this.error(`the package '${ast.aliasId.lexeme}' is un-imported`, ast.aliasId);
      }
      const pkg = this.dependencies.get(ast.aliasId.lexeme);
      if (!pkg.components.has(ast.component.lexeme)) {
        this.error(`'${ast.component.lexeme}' is undefined in '${ast.aliasId.lexeme}'`, ast.component);
      }
      this.usedPackages.get(ast.aliasId.lexeme).set(ast.component.lexeme, true);
    } else {
      throw new Error('unimplemented');
    }
  }
}

module.exports = Analyser;
