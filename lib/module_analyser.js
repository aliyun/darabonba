'use strict';

const assert = require('assert');
const debug = require('debug')('dara:analyser:module');

const { Tag } = require('./tag');
const Env = require('./env');
const { getComponentName, display, isSameType } = require('./helper');

function loadModule(pkg, module) {
  const current = module.pkg ? pkg.libraries.get(module.pkg) : pkg;
  return current.components.get(module.name);
}

class Analyser extends require('./common_analyser') {
  constructor(ctx, pkg) {
    super(ctx, pkg);
    // 初始化其他内部状态
    this.consts = new Map();
    this.properties = new Map();
    this.methods = new Map();
    this.name = '';
    this.implements = [];
    // prechecked status
    this.prechecked = false;
    this.calledParentModule = false;
  }

  check(ast) {
    assert.strictEqual(ast.type, 'module');
    debug(`start pre analyse module: ${this.filename}`);
    this.name = ast.name.lexeme;
    this.checkImports(ast);
    this.checkExtends(ast);
    this.checkImplements(ast);
    // instance properties
    this.checkTypes(ast);
    this.checkInit(ast);
    this.preCheckMethods(ast);
    this.prechecked = true;
  }

  checkExtends(ast) {
    if (!ast.extends) {
      return;
    }

    this.checkType(ast.extends);
    const type = this.getType(ast.extends);
    if (type.type !== 'module') {
      this.error(`'${getComponentName(type)}' is not a module`, ast.extends);
    }

    if (ast.extends.tag === Tag.ID) {
      const moduleId = ast.extends.lexeme;
      // checkpoint: 不能自己继承自己
      if (moduleId === this.name) {
        this.error(`'${moduleId}' can not extends itself`, ast.extends);
      }
    }

    this.parentModule = type;
  }

  checkImplements(ast) {
    const impls = new Map();

    ast.implements.forEach((item) => {
      // checkpoint: 只能实现一个接口
      const type = this.assertAsInterface(item);
      const name = getComponentName(type);
      // checkpoint: 不能重复实现一个接口
      if (impls.has(name)) {
        this.error(`duplicate interface`, item);
      }
      this.implements.push(type);
      impls.set(name, 'true');
    });
  }

  checkTypes(ast) {
    this.vidCounter = new Map();
    ast.moduleBody.nodes.filter((item) => {
      return item.type === 'type';
    }).forEach((node) => {
      this.checkType(node.value);

      const key = node.vid.lexeme;
      if (this.properties.has(key)) {
        // 重复定义检查
        this.error(`redefined type '${key}'`, node.vid);
      }
      this.properties.set(key, node);
      this.vidCounter.set(key, 0);
    });
  }

  checkInit(ast) {
    const inits = ast.moduleBody.nodes.filter((item) => {
      return item.type === 'init';
    });

    if (inits.length > 1) {
      this.error('only one init can be allowed.', inits[1]);
    }

    const instanceMethod = ast.moduleBody.nodes.find((item) => {
      return (item.type === 'function' && item.isStatic === false);
    });

    const init = ast.moduleBody.nodes.find((item) => {
      return item.type === 'init';
    });

    this.init = init;

    if (instanceMethod) {
      if (!init && !this.parentModule) {
        this.error('must have a init when there is a non-static function', ast.moduleName);
      }
    }
  }

  preCheckMethods(ast) {
    // checkpoint: 不能重复定义 function
    ast.moduleBody.nodes.forEach((node) => {
      if (node.type === 'function') {
        const key = node.functionName.lexeme;
        // 重复定义检查
        if (this.methods.has(key)) {
          this.error(`redefined function '${key}'`, node.functionName);
        }
        this.methods.set(key, node);
      }
    });
  }

  checkMethods(ast) {
    assert.strictEqual(this.prechecked, true, 'must pre-check before check methods');
    debug(`start post analyse module: ${this.filename}`);
    ast.moduleBody.nodes.forEach((item) => {
      if (item.type === 'function') {
        this.visitFunction(item);
      } else if (item.type === 'init') {
        this.visitInit(item);
      }
    });

    if (this.implements.length > 0) {
      for (let i = 0; i < this.implements.length; i++) {
        const type = this.implements[i];
        const interface_ = this.loadComponent(type);
        const methods = interface_.analyser.methods;
        for (const [key, methodInInterface] of methods) {
          if (!this.methods.has(key)) {
            this.error(`must implement method ${getComponentName(type)}.${key}()`, ast.name);
          }
          const methodInModule = this.methods.get(key);
          if (methodInModule.isAsync !== methodInInterface.isAsync) {
            this.error(`the async modifier mismatched`, ast.name);
          }

          const returnTypeInModule = this.getType(methodInModule.returnType);
          const returnTypeInInterface = this.getType(methodInInterface.returnType);
          if (!isSameType(returnTypeInModule, returnTypeInInterface)) {
            this.error(`the return type mismatched, expect: ${display(returnTypeInInterface)}, but ${display(returnTypeInModule)}`, ast.name);
          }

          const expectedTypes = this.getParameterTypes(methodInInterface);
          const actualTypes = this.getParameterTypes(methodInModule);
          if (expectedTypes.length !== actualTypes.length) {
            this.error(`the parameter types mismatched, expect ${key}(${expectedTypes.map((item) => display(item)).join(', ')}), but ` +
            `${key}(${actualTypes.map((item) => display(item)).join(', ')})`, ast.name);
          }

          for (let j = 0; j < expectedTypes.length; j++) {
            if (!isSameType(expectedTypes[j], actualTypes[j])) {
              this.error(`the parameter types mismatched, expect ${key}(${expectedTypes.map((item) => display(item)).join(', ')}), but ` +
              `${key}(${actualTypes.map((item) => display(item)).join(', ')})`, ast.name);
            }
          }
        }
      }
    }
  }

  visitInit(ast) {
    assert.strictEqual(ast.type, 'init');
    const env = new Env();
    this.visitParams(ast.params, env);

    if (ast.initBody) {
      const ctx = {
        isStatic: false,
        isAsync: false,
        isInitMethod: true,
        local: env,
        variables: new Map()
      };
      this.visitStmts(ast.initBody, ctx);
      // checkpoint: 如果有继承关系，必须有 super 调用
      if (this.parentModule && !this.hasSuperCall(ast.initBody)) {
        this.error(`must contain 'super' call`, ast);
      }
    }
  }

  // helpers
  getInstanceProperty(vid) {
    let current = this;
    if (current.properties.has(vid)) {
      // check B
      return current.properties.get(vid);
    }

    while (current.parentModule) {
      const module = loadModule(current.pkg, current.parentModule);
      current = module.analyser;
      // check C, D, E
      if (current.properties.has(vid)) {
        return current.properties.get(vid);
      }
    }

    return null;
  }

  hasSuperCall(ast) {
    for (let i = 0; i < ast.stmts.length; i++) {
      const stmt = ast.stmts[i];
      if (stmt.type === 'super') {
        return true;
      }
    }

    return false;
  }

}

module.exports = Analyser;
