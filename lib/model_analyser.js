'use strict';

const assert = require('assert');

const BaseAnalyser = require('./analyser');

class Analyser extends BaseAnalyser {
  constructor(ctx, pkg) {
    super(ctx, pkg);
  }

  check(ast) {
    assert.strictEqual(ast.type, 'model');
    this.checkImports(ast);
    this.visitModel(ast);
    // save used types on ast
    ast.usedTypes = this.usedTypes;
  }

  visitModel(ast) {
    assert.strictEqual(ast.type, 'model');
    this.usedFeatures.set('defined_model', true);
    const modelName = ast.name.lexeme;
    const modelBody = ast.modelBody;
    const keys = new Map();
    for (var i = 0; i < modelBody.nodes.length; i++) {
      const node = modelBody.nodes[i];
      const fieldName = node.fieldName.lexeme;
      // checkpoint: 字段名不得重复
      if (keys.has(fieldName)) {
        this.error(`redefined field "${fieldName}" in model "${modelName}"`, node.fieldName);
      }
      keys.set(fieldName, true);
      this.checkType(node.fieldType);
    }
  }
}

module.exports = Analyser;
