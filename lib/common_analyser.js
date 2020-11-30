'use strict';

const assert = require('assert');

const { Tag } = require('./tag');
const Env = require('./env');
const BaseAnalyser = require('./analyser');
const {
  isNumber, isInteger
} = require('./util');
const { display, getComponentName, isSameType } = require('./helper');

function _basic(name) {
  return {
    type: 'basic',
    name: name
  };
}

function _extern(aliasId, name) {
  return {
    type: 'extern_component',
    aliasId,
    component: name
  };
}

function isSameNumber(expect, actual) {
  if (isNumber(expect.name) && isNumber(actual.name)) {
    if (isInteger(expect.name) && actual.name === 'integer') {
      return true;
    }

    if ((expect.name === 'long' || expect.name === 'ulong') && isInteger(actual.name)) {
      return true;
    }

    if (expect.name === 'ulong' && actual.name === 'long') {
      return true;
    }
  }

  return false;
}

function isBuiltinModel(type) {
  return type.type === 'model' && type.name === 'Model' && type.pkg === '$builtin';
}

function findProperty(model, propName) {
  return model.modelBody.nodes.find((item) => {
    return item.fieldName.lexeme === propName;
  });
}

function getObjectName(object) {
  if (object.type === 'id') {
    return object.id.lexeme;
  }
  if (object.type === 'property') {
    return `${getObjectName(object.object)}.${object.property.lexeme}`;
  }
}

function loadModule(pkg, module) {
  const current = module.pkg ? pkg.libraries.get(module.pkg) : pkg;
  return current.components.get(module.name);
}

class Analyser extends BaseAnalyser {
  constructor(ctx, pkg) {
    super(ctx, pkg);
    // 初始化其他内部状态
    this.consts = new Map();
    this.properties = new Map();
    this.methods = new Map();
    this.name = '';
    // prechecked status
    this.prechecked = false;
    this.calledParentModule = false;
  }

  assertAsModule(node) {
    this.checkType(node);
    const type = this.getType(node);
    if (type.type !== 'module') {
      this.error(`'${getComponentName(type)}' is not a module`, node);
    }
    return type;
  }

  assertAsModel(node) {
    this.checkType(node);
    const type = this.getType(node);
    if (type.type !== 'model') {
      this.error(`'${getComponentName(type)}' is not a model`, node);
    }
    return type;
  }

  assertAsInterface(node) {
    this.checkType(node);
    const type = this.getType(node);
    if (type.type !== 'interface') {
      this.error(`'${getComponentName(type)}' is not a interface`, node);
    }
    return type;
  }

  visitParams(ast, env) {
    assert.strictEqual(ast.type, 'params');
    const paramMap = new Map();
    for (var i = 0; i < ast.params.length; i++) {
      const node = ast.params[i];
      assert.strictEqual(node.type, 'param');
      const name = node.paramName.lexeme;
      if (paramMap.has(name)) {
        // checkpoint: 重复参数名检查
        this.error(`redefined parameter '${name}'`, node.paramName);
      }
      paramMap.set(name, true);
      this.checkType(node.paramType);
      env.set(name, this.getType(node.paramType));
    }
  }

  visitFunction(ast) {
    assert.strictEqual(ast.type, 'function');
    const env = new Env();
    this.visitParams(ast.params, env);
    this.checkType(ast.returnType);

    if (ast.functionBody) {
      if (!ast.isStatic) {
        env.set('__this', {
          type: 'module',
          name: this.name
        });
      }

      const ctx = {
        returnType: this.getType(ast.returnType),
        isStatic: ast.isStatic,
        isAsync: ast.isAsync,
        local: env,
        variables: new Map()
      };
      assert.strictEqual(ast.functionBody.type, 'functionBody');
      this.visitStmts(ast.functionBody.stmts, ctx);
      // checkpoint: 检查是否有 return statement
      this.checkReturnStmt(ast.functionBody.stmts, ctx, ast.functionName);
      this.checkUnreachableCode(ast.functionBody.stmts);
      this.checkUnusedVariable(ctx.variables);
    }
  }

  visitStmts(ast, ctx) {
    assert.strictEqual(ast.type, 'stmts');
    for (var i = 0; i < ast.stmts.length; i++) {
      const node = ast.stmts[i];
      this.visitStmt(node, ctx);
    }
  }

  visitStmt(ast, ctx) {
    if (ast.type === 'return') {
      this.visitReturn(ast, ctx);
    } else if (ast.type === 'if') {
      this.visitIf(ast, ctx);
    } else if (ast.type === 'throw') {
      this.visitThrow(ast, ctx);
    } else if (ast.type === 'assign') {
      this.visitAssign(ast, ctx);
    } else if (ast.type === 'break') {
      // unnecessary to check
    } else if (ast.type === 'declare') {
      this.visitDeclareStmt(ast, ctx);
    } else if (ast.type === 'try') {
      this.visitTry(ast, ctx);
    } else if (ast.type === 'while') {
      this.visitWhile(ast, ctx);
    } else if (ast.type === 'for') {
      this.visitFor(ast, ctx);
    } else if (ast.type === 'for_of') {
      this.visitForOf(ast, ctx);
    } else {
      this.visitExpr(ast, ctx);
      const type = this.getExprType(ast, ctx);
      if (type.type === 'method_def' || type.type === 'module_def' || type.type === 'model_def' || type.type === 'package') {
        this.error(`invalid expression`, ast.expr);
      }
    }
  }

  // statements
  visitDeclareStmt(ast, ctx) {
    assert.strictEqual(ast.type, 'declare');
    const id = ast.id.lexeme;
    // 当前作用域是否定义过
    if (ctx.local.has(id)) {
      this.error(`the id '${id}' was defined`, ast.id);
    }

    this.visitExpr(ast.expr, ctx);
    const type = this.getExprType(ast.expr, ctx);

    let expected;
    if (type.type === 'basic' && type.name === 'null') {
      if (!ast.expectedType) {
        this.error(`must declare type when value is null`, ast.id);
      }
      expected = this.getType(ast.expectedType);
    } else {
      if (ast.expectedType) {
        expected = this.getType(ast.expectedType);
        if (!this.isAssignable(expected, type, ast.expr)) {
          this.error(`declared variable with mismatched type, ` +
            `expected: ${display(expected)}, actual: ${display(type)}`, ast.id);
        }
      }
    }

    ctx.local.set(id, expected || type);
    ctx.variables.set(id, { id: ast.id, used: false });
    ast.expr.inferred = expected || type;
  }

  visitReturn(ast, ctx) {
    assert.strictEqual(ast.type, 'return');
    this.visitExpr(ast.expr, ctx);

    if (ctx.isInitMethod) {
      if (ast.expr.type !== 'empty') {
        this.error(`should not have return value in init method`, ast.expr);
      }
      return;
    }

    // return type check
    const actual = this.getExprType(ast.expr, ctx);
    const expect = ctx.returnType;
    if (!this.isAssignable(expect, actual, ast.expr)) {
      console.log(ast);
      this.error(`the return type is not expected, expect: ${display(expect)}, actual: ${display(actual)}`, ast.expr);
    }
  }

  visitAssign(ast, ctx) {
    assert.strictEqual(ast.type, 'assign');
    if (ast.left.type === 'id') {
      this.checkId(ast.left.id, ctx);
    } else if (ast.left.type === 'member') {
      this.visitMember(ast.left, ctx);
    } else if (ast.left.type === 'property') {
      this.visitProperty(ast.left, ctx);
    } else {
      throw new Error('unimplemented');
    }
    const expected = this.getExprType(ast.left, ctx);
    ast.left.inferred = expected;
    this.visitExpr(ast.expr, ctx);
    const actual = this.getExprType(ast.expr, ctx);
    if (!this.isAssignable(expected, actual, ast.expr)) {
      this.error(`can not assign ${display(actual)} to ${display(expected)}`, ast.expr);
    }
  }

  visitIf(ast, ctx) {
    assert.strictEqual(ast.type, 'if');

    for (let i = 0; i < ast.branches.length; i++) {
      const branch = ast.branches[i];
      if (branch.type === 'if_branch') {
        this.visitExpr(branch.condition, ctx);
        // TODO: branch condition should be boolean type
      }
      this.visitStmts(branch.stmts, ctx);
    }
  }

  visitThrow(ast, ctx) {
    assert.strictEqual(ast.type, 'throw');
    this.visitMap(ast.expr, ctx);
    this.usedFeatures.set('throw', true);
  }

  visitWhile(ast, ctx) {
    assert.strictEqual(ast.type, 'while');
    ctx.local = new Env(ctx.local);
    this.visitExpr(ast.condition, ctx);
    if (!this.isBooleanType(ast.condition, ctx)) {
      this.error(`the condition expr must be boolean type`, ast.condition);
    }
    this.visitStmts(ast.stmts, ctx);
    ctx.local = ctx.local.preEnv;
  }

  visitFor(ast, ctx) {
    assert.strictEqual(ast.type, 'for');
    ctx.local = new Env(ctx.local);
    this.visitExpr(ast.init, ctx);
    this.visitExpr(ast.test, ctx);
    if (ast.test.type !== 'empty' && !this.isBooleanType(ast.test, ctx)) {
      this.error(`the test expr must be boolean type`, ast.condition);
    }
    this.visitExpr(ast.update, ctx);
    this.visitStmts(ast.stmts, ctx);
    ctx.local = ctx.local.preEnv;
  }

  visitForOf(ast, ctx) {
    assert.strictEqual(ast.type, 'for_of');
    ctx.local = new Env(ctx.local);
    this.visitExpr(ast.right, ctx);
    const listType = this.getExprType(ast.right, ctx);
    if (listType.type !== 'array') {
      this.error(`the list in for must be array type`, ast.right);
    }
    ctx.local.set(ast.left.id.lexeme, listType.itemType);
    this.visitStmts(ast.stmts, ctx);
    ctx.local = ctx.local.preEnv;
  }

  visitTry(ast, ctx) {
    assert.strictEqual(ast.type, 'try');
    this.visitStmts(ast.tryBlock, ctx);
    if (ast.catchBlock) {
      // create new local
      var local = new Env(ctx.local);
      local.set(ast.catchId.lexeme, _extern('$builtin', 'Error'));
      ctx.local = local;
      this.visitStmts(ast.catchBlock, ctx);
      // restore the local
      ctx.local = ctx.local.preEnv;
    }

    if (ast.finallyBlock) {
      this.visitStmts(ast.finallyBlock, ctx);
    }
  }

  visitExpr(ast, ctx) {
    if (ast.type === 'string') {
      // noop();
    } else if (ast.type === 'number') {
      // noop();
    } else if (ast.type === 'boolean') {
      // noop();
    } else if (ast.type === 'null') {
      // noop();
    } else if (ast.type === 'map') {
      this.visitMap(ast, ctx);
    } else if (ast.type === 'id') {
      this.checkId(ast.id, ctx);
    } else if (ast.type === 'template_string') {
      for (var i = 0; i < ast.elements.length; i++) {
        var item = ast.elements[i];
        if (item.type === 'expr') {
          this.visitExpr(item.expr, ctx);
        }
      }
    } else if (ast.type === 'call') {
      this.visitCall(ast, ctx);
    } else if (ast.type === 'construct_module') {
      this.visitConstructModule(ast, ctx);
    } else if (ast.type === 'construct_model') {
      this.visitConstructModel(ast, ctx);
    } else if (ast.type === 'array') {
      this.visitArray(ast, ctx);
    } else if (ast.type === 'logical') {
      this.visitExpr(ast.left, ctx);
      // the expr type should be boolean
      if (!this.isBooleanType(ast.left, ctx)) {
        this.error(`the left expr must be boolean type`, ast.left);
      }
      this.visitExpr(ast.right, ctx);
      // the expr type should be boolean
      if (!this.isBooleanType(ast.right, ctx)) {
        this.error(`the right expr must be boolean type`, ast.right);
      }
    } else if (ast.type === 'not') {
      this.visitExpr(ast.expr, ctx);
      if (!this.isBooleanType(ast.expr, ctx)) {
        this.error(`the expr after ! must be boolean type`, ast.expr);
      }
    } else if (ast.type === 'super') {
      this.visitSuperCall(ast, ctx);
    } else if (ast.type === 'member') {
      this.visitMember(ast, ctx);
    } else if (ast.type === 'property') {
      this.visitProperty(ast, ctx);
    } else if (ast.type === 'to') {
      this.visitTo(ast, ctx);
    } else if (ast.type === 'inline') {
      this.visitInlineCall(ast, ctx);
    } else if (ast.type === 'declare_expr') {
      this.visitDeclareExpr(ast, ctx);
    } else if (ast.type === 'empty') {
      // no op
    } else if (ast.type === 'binary') {
      this.visitExpr(ast.left, ctx);
      this.visitExpr(ast.right, ctx);
      const leftType = this.getExprType(ast.left, ctx);
      const rightType = this.getExprType(ast.right, ctx);
      if (!isSameType(leftType, rightType)) {
        this.error(`the right expr type(${display(rightType)}) mismatch with left expr type(${display(leftType)})`, ast.right);
      }
    
    } else if (ast.type === 'assign') {
      this.visitAssign(ast, ctx);
    } else {
      console.log(ast);
      throw new Error('unimplemented.');
    }
    ast.inferred = this.getExprType(ast, ctx);
  }

  // expressions
  visitConstructModel(ast, ctx) {
    // model in current package
    const type = this.assertAsModel(ast.component);
    const modelName = getComponentName(type);
    const model = this.loadComponent(type);

    for (let i = 0; i < ast.fields.fields.length; i++) {
      const field = ast.fields.fields[i];
      const name = field.key.lexeme;
      const modelField = findProperty(model.ast, name);
      if (!modelField) {
        this.error(`the field '${name}' is undefined in model '${modelName}'`, field.key);
      }

      this.visitExpr(field.expr, ctx);

      const type = this.getExprType(field.expr, ctx);
      let expected = this.getType(modelField.fieldType);

      if (!this.eql([expected], [type])) {
        this.error(`the field type are mismatched. expected ` +
          `${display(expected)}, but ${display(type)}`, field.key);
      }
      field.inferred = type;
      field.expectedType = expected;
    }
  }

  visitConstructModule(ast, ctx) {
    const actual = [];
    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      this.visitExpr(arg, ctx);
      actual.push(arg.inferred);
    }

    const type = this.assertAsModule(ast.component);
    const module = this.loadComponent(type);
    if (!module.analyser.init) {
      this.error(`the module '${getComponentName(type)}' has no init`, ast.component);
    }

    const expected = module.analyser.getParameterTypes(module.analyser.init);
    if (!this.eql(expected, actual)) {
      this.error(`the parameter` +
        ` types are mismatched. expected ` +
        `new ${getComponentName(type)}(${expected.map((item) => display(item)).join(', ')}), but ` +
        `new ${getComponentName(type)}(${actual.map((item) => display(item)).join(', ')})`, ast.component);
    }
  }

  visitDeclareExpr(ast, ctx) {
    assert.strictEqual(ast.type, 'declare_expr');
    const id = ast.id.lexeme;
    // 当前作用域是否定义过
    if (ctx.local.has(id)) {
      this.error(`the id '${id}' was defined`, ast.id);
    }

    if (ast.expr) {
      this.visitExpr(ast.expr, ctx);
      const type = this.getExprType(ast.expr, ctx);

      let expected;
      if (type.type === 'basic' && type.name === 'null') {
        if (!ast.expectedType) {
          this.error(`must declare type when value is null`, ast.id);
        }
        expected = this.getType(ast.expectedType);
      } else {
        if (ast.expectedType) {
          expected = this.getType(ast.expectedType);
          if (!this.isAssignable(expected, type, ast.expr)) {
            this.error(`declared variable with mismatched type, ` +
              `expected: ${display(expected)}, actual: ${display(type)}`, ast.id);
          }
        }
      }
      ctx.local.set(id, expected || type);
      ctx.variables.set(id, { id: ast.id, used: false });
      ast.expr.inferred = expected || type;
    }
  }

  loadComponent(type) {
    const pkg = type.pkg ? this.pkg.libraries.get(type.pkg) : this.pkg;
    return pkg.components.get(type.name);
  }

  visitSuperCall(ast, ctx) {
    if (!ctx.isInitMethod) {
      this.error(`super only allowed in init method`, ast);
    }

    if (!this.parentModule) {
      this.error(`this module have no parent module`, ast);
    }

    let module = loadModule(this.pkg, this.parentModule);
    if (!module.analyser.init) {
      this.error(`the parent module '${getComponentName(this.parentModule)}' have no init method`, ast);
    }

    const expected = this.getParameterTypes(module.analyser.init);

    const actual = [];
    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      this.visitExpr(arg, ctx);
      const type = this.getExprType(arg, ctx);
      actual.push(type);
    }

    if (!this.eql(expected, actual)) {
      this.error(`the parameter` +
        ` types are mismatched. expected ` +
        `${getComponentName(this.parentModule)}(${expected.map((item) => display(item)).join(', ')}), but ` +
        `${getComponentName(this.parentModule)}(${actual.map((item) => display(item)).join(', ')})`, ast);
    }

    this.calledParentModule = true;
  }

  visitInlineCall(ast, ctx) {
    assert.strictEqual(ast.type, 'inline');
    const actual = [];
    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      this.visitExpr(arg, ctx);
      const type = this.getExprType(arg, ctx);
      actual.push(type);
    }

    const name = ast.name.lexeme;
    switch (name) {
    case '#append':
      {
        if (actual.length !== 2) {
          this.error(`the #append parameter length expect 2, but ${actual.length}`, ast.name);
        }
        const [listType, itemType] = actual;
        if (listType.type !== 'array') {
          this.error(`must be array type`, ast.args[0]);
        }

        if (!this.isAssignable(listType.itemType, itemType)) {
          this.error(`the item type is not match with list`, ast.args[1]);
        }
        ast.inferred = listType;
      }
      this.usedFeatures.set('inline_append', true);
      break;
    case '#delete':
      {
        if (actual.length !== 2) {
          this.error(`the #delete parameter length expect 2, but ${actual.length}`, ast.name);
        }
        const [mapType, keyType] = actual;
        if (mapType.type !== 'map') {
          this.error(`must be map type`, ast.args[0]);
        }
        if (!(keyType.type === 'basic' && keyType.name === 'string')) {
          this.error(`must be string type`, ast.args[1]);
        }
        ast.inferred = _basic('void');
      }
      this.usedFeatures.set('inline_delete', true);
      break;
    case '#length':
      {
        if (actual.length !== 1) {
          this.error(`the #length parameter length expect 1, but ${actual.length}`, ast.name);
        }
        const [listType] = actual;
        if (listType.type !== 'array') {
          this.error(`must be array type`, ast.args[0]);
        }
        ast.inferred = _basic('int32');
      }
      this.usedFeatures.set('inline_length', true);
      break;
    default:
      this.error(`un-supported inline call(${name})`, ast.name);
    }
  }

  visitCall(ast, ctx) {
    assert.strictEqual(ast.type, 'call');
    const actual = [];
    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      this.visitExpr(arg, ctx);
      const type = this.getExprType(arg, ctx);
      actual.push(type);
    }

    if (ast.callee.type === 'id') {
      const id = ast.callee.id;
      if (id.tag === Tag.VID) {
        this.error('can not call with property', id);
      }

      if (id.tag === Tag.PACK_ID) {
        this.error('can not call with package', id);
      }

      if (id.tag === Tag.ID) {
        // function
        const name = id.lexeme;
        if (!this.methods.has(name)) {
          this.error(`the function '${name}' is undefined`, id);
        }

        const def = this.methods.get(name);
        if (def.type === 'function') {
          if (!ctx.isAsync && def.isAsync) {
            this.error(`the async function only can be used in async function`, id);
          }

          if (ctx.isStatic && !def.isStatic) {
            this.error(`the function can not be used in static function`, id);
          }
        }

        const expected = this.getParameterTypes(def);

        if (!this.eql(expected, actual)) {
          this.error(`the parameter` +
            ` types are mismatched. expected ` +
            `${name}(${expected.map((item) => display(item)).join(', ')}), but ` +
            `${name}(${actual.map((item) => display(item)).join(', ')})`, id);
        }

        ast.isAsync = def.isAsync;
        ast.isStatic = def.isStatic;
        ast.hasThrow = def.isAsync || def.hasThrow;
        ast.inferred = this.getType(def.returnType);
        return;
      }
    }

    if (ast.callee.type === 'property') {
      this.visitExpr(ast.callee, ctx);
      const type = this.getExprType(ast.callee, ctx);
      if (type.type !== 'method_def') {
        this.error(`can not call with non-method`, ast.callee);
      }

      const component = this.loadComponent({ name: type.module, pkg: type.pkg });
      const def = component.analyser.methods.get(type.name);
      const expected = component.analyser.getParameterTypes(def);
      const name = getObjectName(ast.callee);
      if (!this.eql(expected, actual)) {
        this.error(`the parameter` +
          ` types are mismatched. expected ` +
          `${name}(${expected.map((item) => display(item)).join(', ')}), but ` +
          `${name}(${actual.map((item) => display(item)).join(', ')})`, ast.callee);
      }

      ast.isAsync = def.isAsync;
      ast.isStatic = def.isStatic;
      ast.hasThrow = def.isAsync || def.hasThrow;
      ast.inferred = component.analyser.getType(def.returnType);
      if (ast.inferred.type === 'model') {
        ast.inferred.pkg = type.pkg;
      }
      return;
    }

    console.log(ast);
    throw new Error('un-implemented');
  }

  visitMember(ast, ctx) {
    assert.strictEqual(ast.type, 'member');
    this.visitExpr(ast.object, ctx);
    this.visitExpr(ast.index, ctx);

    const objectType = this.getExprType(ast.object, ctx);
    if (objectType.type !== 'map' && objectType.type !== 'array') {
      this.error('the [] form only support map or array type', ast.object);
    }

    if (objectType.type === 'map') {
      if (!this.isStringType(ast.index, ctx)) {
        this.error('the expr must be string type for map', ast.index);
      }
    }

    if (objectType.type === 'array') {
      if (!this.isNumberType(ast.index, ctx)) {
        this.error('the expr must be integer type for array', ast.index);
      }
    }
  }

  visitProperty(ast, ctx) {
    assert.strictEqual(ast.type, 'property');
    const prop = ast.property.lexeme;

    this.visitExpr(ast.object, ctx);

    const objectType = this.getExprType(ast.object, ctx);
    if (objectType.type !== 'model' && objectType.type !== 'module'
      && objectType.type !== 'module_def' && objectType.type !== 'package') {
      this.error(`only can use '.' after ${getObjectName(ast.object)}`, ast.property);
    }

    if (objectType.type === 'package') {
      const pkg = this.pkg.libraries.get(objectType.name);
      if (!pkg.components.has(prop)) {
        this.error(`${prop} is undefined in package '${objectType.name}'`, ast.property);
      }
      const component = pkg.components.get(prop);
      if (component.type !== 'module') {
        this.error(`${prop} is not a module`, ast.property);
      }
      return;
    }

    if (objectType.type === 'module_def') {
      const module = loadModule(this.pkg, objectType);
      if (!module.analyser.methods.has(prop)) {
        this.error(`the method '${prop}' is undefined ` +
          `in module '${getComponentName(objectType)}'`, ast.property);
      }
      const method = module.analyser.methods.get(prop);
      if (!method.isStatic) {
        this.error(`'${getComponentName(objectType)}.${prop}' is not static method`, ast.property);
      }
      return;
    }

    if (objectType.type === 'module') {
      const module = loadModule(this.pkg, objectType);
      if (!module.analyser.methods.has(prop)) {
        this.error(`the method '${prop}' is undefined ` +
          `in module '${getComponentName(objectType)}'`, ast.property);
      }
      const method = module.analyser.methods.get(prop);
      if (method.isStatic) {
        this.error(`'${getComponentName(objectType)}.${prop}' is static method`, ast.property);
      }
      return;
    }

    const component = this.loadComponent(objectType);
    if (component.type === 'model') {
      const find = findProperty(component.ast, prop);
      if (!find) {
        this.error(`the field '${prop}' is undefined ` +
          `in model ${objectType.name}`, ast.property);
      }

      return;
    }

    console.log(ast);
    throw new Error('un-implement');
  }

  visitMap(ast, ctx) {
    assert.strictEqual(ast.type, 'map');
    for (var i = 0; i < ast.fields.length; i++) {
      const field = ast.fields[i];
      if (field.type === 'mapField') {
        this.visitExpr(field.expr, ctx);
      } else if (field.type === 'expandField') {
        this.visitExpr(field.expr, ctx);
        const type = field.expr.inferred;
        if (type.type !== 'map') {
          this.error(`can not expand non-map expression`, field.expr);
        }
      }
    }
    ast.inferred = this.getExprType(ast, ctx);
  }

  visitArray(ast, ctx) {
    assert.strictEqual(ast.type, 'array');
    for (var i = 0; i < ast.items.length; i++) {
      this.visitExpr(ast.items[i], ctx);
    }
  }

  visitTo(ast, ctx) {
    assert.deepEqual(ast.type, 'to');
    this.visitExpr(ast.from, ctx);
    const fromType = this.getExprType(ast.from, ctx);
    if (fromType.type !== 'map') {
      this.error(`only map can work with model`, ast.from);
    }
    this.checkType(ast.to);
    const toType = this.getType(ast.to);
    if (toType.type !== 'model') {
      this.error(`'${getComponentName(toType)}' is not a model`, ast.to);
    }
  }

  // helpers
  getExprType(ast, ctx) {
    if (ast.inferred) {
      return ast.inferred;
    }

    if (ast.type === 'string') {
      return _basic('string');
    }

    if (ast.type === 'number') {
      return _basic(ast.value.type);
    }

    if (ast.type === 'boolean') {
      return _basic('boolean');
    }

    if (ast.type === 'map') {
      return this.getMapType(ast, ctx);
    }

    if (ast.type === 'id') {
      return this.getIdType(ast.id, ctx);
    }

    if (ast.type === 'null') {
      return _basic('null');
    }

    if (ast.type === 'template_string') {
      return _basic('string');
    }

    if (ast.type === 'super') {
      return this.parentModule;
    }

    if (ast.type === 'construct_module') {
      return this.getType(ast.component);
    }

    if (ast.type === 'construct_model') {
      return this.getType(ast.component);
    }

    if (ast.type === 'array') {
      return this.getArrayType(ast, ctx);
    }

    if (ast.type === 'not' || ast.type === 'logical') {
      return _basic('boolean');
    }

    if (ast.type === 'binary') {
      return _basic('boolean');
    }

    if (ast.type === 'member') {
      const type = this.getExprType(ast.object);
      if (type.type === 'map') {
        return type.valueType;
      }

      if (type.type === 'array') {
        return type.itemType;
      }
    }

    if (ast.type === 'property') {
      const type = this.getExprType(ast.object, ctx);
      return this.getPropertyType(type, ast.property.lexeme);
    }

    if (ast.type === 'to') {
      return this.getType(ast.to);
    }

    if (ast.type === 'empty') {
      return _basic('void');
    }

    if (ast.type === 'declare_expr') {
      return _basic('void');
    }

    if (ast.type === 'assign') {
      return _basic('void');
    }

    console.log(ast);
    throw new Error('can not get type');
  }

  getMapType(ast, ctx) {
    if (ast.fields.length === 0) {
      return {
        type: 'map',
        keyType: _basic('string'),
        valueType: _basic('any')
      };
    }

    var current;
    var same = true;
    for (let i = 0; i < ast.fields.length; i++) {
      const field = ast.fields[i];
      if (field.type === 'mapField') {
        let type = this.getExprType(field.expr, ctx);
        if (current && !isSameType(current, type)) {
          same = false;
          break;
        }
        current = type;
      } else if (field.type === 'expandField') {
        let type = this.getExprType(field.expr, ctx);
        if (current && !isSameType(current, type.valueType)) {
          same = false;
          break;
        }
        current = type.valueType;
      }
    }

    return {
      type: 'map',
      keyType: _basic('string'),
      valueType: same ? current : _basic('any')
    };
  }

  getArrayType(ast, ctx) {
    if (ast.items.length === 0) {
      return {
        type: 'array',
        itemType: _basic('any')
      };
    }

    let current;
    let same = true;
    for (let i = 0; i < ast.items.length; i++) {
      const type = this.getExprType(ast.items[i], ctx);
      if (current && !isSameType(current, type)) {
        same = false;
        break;
      }
      current = type;
    }
    return {
      type: 'array',
      itemType: same ? current : _basic('any')
    };
  }

  getType(t) {
    if (t.type === 'array') {
      return {
        type: 'array',
        itemType: this.getType(t.itemType)
      };
    }

    if (t.type === 'map') {
      return {
        type: 'map',
        keyType: this.getType(t.keyType),
        valueType: this.getType(t.valueType)
      };
    }

    if (t.tag === Tag.ID) {
      if (this.pkg.components.has(t.lexeme)) {
        const component = this.pkg.components.get(t.lexeme);
        return {
          type: component.type,
          name: t.lexeme
        };
      }
    }

    if (t.type === 'extern_component') {
      const pkg = this.pkg.libraries.get(t.aliasId.lexeme);
      const component = pkg.components.get(t.component.lexeme);
      return {
        type: component.type,
        name: t.component.lexeme,
        pkg: t.aliasId.lexeme
      };
    }

    if (t.tag === Tag.TYPE) {
      return _basic(t.lexeme);
    }

    console.log(t);
    throw new Error('un-implemented');
  }

  checkPkgID(id) {
    assert.strictEqual(id.tag, Tag.PACK_ID);
    const name = id.lexeme;
    if (!this.dependencies.has(name)) {
      this.error(`the package '${name}' is un-imported`, id);
    }
  }

  checkId(id, env) {
    const name = id.lexeme;
    if (id.tag === Tag.VID) {
      if (env.isStatic) {
        this.error(`the module property can not used in static function`, id);
      }

      if (!this.getInstanceProperty(name)) {
        this.error(`the property '${name}' is undefined`, id);
      }

      // checkpoint: 有继承关系时，构造方法中，访问实例属性前必须先调用 super
      if (env.isInitMethod && this.parentModule && !this.calledParentModule) {
        this.error(`'super' must be called before accessing property`, id);
      }

      return;
    }

    if (id.tag === Tag.PACK_ID) {
      this.checkPkgID(id);
      return;
    }

    // 未定义变量检查
    if (env.local && env.local.hasDefined(name)) {
      // 是否在作用域链上定义过
      // id.type = 'variable';
      if (env.variables.has(name)) {
        env.variables.get(name).used = true;
      }
      return;
    }

    if (this.pkg.components.has(name)) {
      this.usedComponents.set(name, this.pkg.components.get(name));
      return;
    }

    this.error(`id '${name}' undefined`, id);
  }

  getIdType(id, env) {
    const name = id.lexeme;

    if (id.tag === Tag.VID) {
      const def = this.getInstanceProperty(name);
      return this.getType(def.value);
    }

    if (id.tag === Tag.PACK_ID) {
      return { type: 'package', name: name };
    }

    if (env.local && env.local.hasDefined(name)) {
      // 返回作用域链上定义的值
      return env.local.get(name);
    }

    if (this.pkg.components.has(name)) {
      const component = this.pkg.components.get(name);
      if (component.type === 'module') {
        return { type: 'module_def', name: name };
      }

      return { type: 'model_def', name: name };
    }

    throw new Error('Can not get the type for variable');
  }

  getPropertyType(type, propName) {
    if (type.type === 'package') {
      return { type: 'module_def', name: propName, pkg: type.name };
    } else if (type.type === 'module_def' || type.type === 'module') {
      const module = loadModule(this.pkg, type);
      const analyser = module.analyser;
      if (analyser.methods.has(propName)) {
        if (type.pkg) {
          return { type: 'method_def', name: propName, module: type.name, pkg: type.pkg };
        }
        return { type: 'method_def', name: propName, module: type.name };
      }
    } else if (type.type === 'model') {
      let model = this.loadComponent(type);
      const find = findProperty(model.ast, propName);
      return this.getType(find.fieldType);
    }

    console.log(type);
    throw new Error('un-implemented');
  }

  getParameterTypes(def) {
    const expected = [];
    const params = def.params.params;
    for (let i = 0; i < params.length; i++) {
      expected.push(this.getType(params[i].paramType));
    }
    return expected;
  }

  checkReturnStmt(ast, ctx, name) {
    if (ctx.returnType.type === 'basic' && ctx.returnType.name === 'void') {
      // no check for void
      return;
    }

    if (!this.hasReturnStmt(ast)) {
      this.error(`no return statement`, name);
    }
  }

  hasReturnStmt(ast) {
    assert.strictEqual(ast.type, 'stmts');

    if (ast.stmts.length === 0) {
      return false;
    }

    const stmt = ast.stmts[ast.stmts.length - 1];
    if (stmt.type === 'return') {
      return true;
    }

    if (stmt.type === 'throw') {
      return true;
    }

    if (stmt.type === 'if') {
      // only if
      if (stmt.branches.length === 1) {
        return false;
      }

      for (let index = 0; index < stmt.branches.length; index++) {
        const branch = stmt.branches[index];
        if (!this.hasReturnStmt(branch.stmts)) {
          return false;
        }
      }

      return true;
    }

    // TODO: try/catch/finally, for

    return false;
  }

  checkUnreachableCode(ast) {
    var breaked = false;
    for (let index = 0; index < ast.stmts.length; index++) {
      const stmt = ast.stmts[index];
      if (breaked) {
        this.error('unreachable code', stmt);
      }
      if (this.hasBreaked(stmt)) {
        breaked = true;
      }
    }
    return breaked;
  }

  checkUnusedVariable(variables) {
    for (const [name, item] of variables) {
      if (!item.used) {
        this.error(`unused variable '${name}'`, item.id);
      }
    }
  }

  hasBreaked(ast) {
    if (ast.type === 'return') {
      return true;
    }

    if (ast.type === 'throw') {
      return true;
    }

    if (ast.type === 'if') {
      // only if
      if (ast.branches.length === 1) {
        return false;
      }

      for (let index = 0; index < ast.branches.length; index++) {
        const branch = ast.branches[index];
        if (!this.checkUnreachableCode(branch.stmts)) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  isBooleanType(expr, ctx) {
    const type = this.getExprType(expr, ctx);
    return type.type === 'basic' && type.name === 'boolean';
  }

  isStringType(expr, ctx) {
    const type = this.getExprType(expr, ctx);
    return type.type === 'basic' && type.name === 'string';
  }

  isNumberType(expr, env) {
    const type = this.getExprType(expr, env);
    return type.type === 'basic' && isNumber(type.name);
  }

  isAssignable(expected, actual, expr) {
    if (isSameType(expected, actual)) {
      return true;
    }

    if (isSameNumber(expected, actual)) {
      return true;
    }

    // actual is null
    if (actual.type === 'basic' && actual.name === 'null') {
      return true;
    }

    if (expected.type === 'map' && actual.type === 'map') {
      if (expr && expr.type === 'map' && expr.fields.length === 0) {
        return true;
      }
    }

    if (expected.type === 'array' && actual.type === 'array') {
      if (expr && expr.type === 'array' && expr.items.length === 0) {
        return true;
      }
    }

    // any = other type
    if (expected.type === 'basic' && expected.name === 'any') {
      return true;
    }

    // $Model vs model
    if (isBuiltinModel(expected) && actual.type === 'model') {
      return true;
    }

    if (expected.type === 'interface' && actual.type === 'module') {
      const current = loadModule(this.pkg, actual);
      const find = current.analyser.implements.find((item) => {
        return item.name === expected.name && item.pkg === expected.pkg;
      });
      if (find) {
        return true;
      }
    }

    return false;
  }

  eql(expects, actuals) {
    if (expects.length !== actuals.length) {
      return false;
    }

    for (var i = 0; i < expects.length; i++) {
      const expect = expects[i];
      const actual = actuals[i];

      if (this.isAssignable(expect, actual)) {
        continue;
      }

      return false;
    }

    return true;
  }
}

module.exports = Analyser;
