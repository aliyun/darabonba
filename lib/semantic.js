'use strict';

const path = require('path');
const fs = require('fs');
const assert = require('assert');

const stripComments = require('strip-json-comments');

const { Tag } = require('./tag');
const Lexer = require('./lexer');
const Parser = require('./parser');
const Env = require('./env');
const {
  isBasicType,
  isNumber,
  isInteger,
  getDarafile
} = require('./util');

const builtin = require('./builtin');

function replace(origin, target) {
  Object.keys(origin).forEach((key) => {
    delete origin[key];
  });

  Object.keys(target).forEach((key) => {
    origin[key] = target[key];
  });
}

function display(item) {
  if (item.type === 'basic') {
    return item.name;
  }

  if (item.type === 'map') {
    return `map[${display(item.keyType)}]${display(item.valueType)}`;
  }

  if (item.type === 'array') {
    return `[${display(item.itemType)}]`;
  }

  if (item.type === 'model') {
    if (item.moduleName) {
      return `${item.moduleName}#${item.name}`;
    }

    return item.name;
  }

  if (item.type === 'class') {
    if (item.moduleName) {
      return `[${item.moduleName}#${item.name}]`;
    }

    return `[${item.name}]`;
  }

  if (item.type === 'module_instance') {
    return item.name;
  }

  if (item.type === 'enum') {
    return item.name;
  }

  if (item.type === 'typedef') {
    return item.name;
  }

  console.log(item);
  throw new Error('unimplemented.');
}

function _basic(name) {
  return {
    type: 'basic',
    name: name
  };
}

function _model(name, moduleName) {
  return {
    type: 'model',
    name: name,
    moduleName
  };
}

function _enum(name, moduleName) {
  return {
    type: 'enum',
    name: name,
    moduleName
  };
}

function _typedef(name, moduleName) {
  return {
    type: 'typedef',
    name: name,
    moduleName
  };
}

function _type(id) {
  if (id.tag === Tag.TYPE) {
    return _basic(id.lexeme);
  }

  if (id.tag === Tag.ID) {
    return _model(id.lexeme);
  }

  console.log(id);
  throw new Error(`unsupported`);
}

function isSameNumber(expect, actual){
  if (isNumber(expect.name) && isNumber(actual.name)) {
    if (expect.name === 'number') {
      return true;
    }

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

function isSameType(expect, actual) {
  if (expect.type === 'basic' && actual.type === 'basic') {
    return expect.name === actual.name;
  }

  if (expect.type === 'model' && actual.type === 'model') {
    return expect.name === actual.name && expect.moduleName === actual.moduleName;
  }

  if (expect.type === 'array' && actual.type === 'array') {
    return isSameType(expect.itemType, actual.itemType);
  }

  if (expect.type === 'map' && actual.type === 'map') {
    return isSameType(expect.keyType, actual.keyType) &&
      isSameType(expect.valueType, actual.valueType);
  }

  if (expect.type === 'module_instance' && actual.type === 'module_instance') {
    return expect.name === actual.name;
  }

  if (expect.type === 'enum' && actual.type === 'enum') {
    return expect.name === actual.name;
  }

  if (expect.type === 'typedef' && actual.type === 'typedef') {
    return expect.moduleName === actual.moduleName && expect.name === actual.name;
  }

  return false;
}

function isAssignable(expected, actual, expr) {
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
    if (expr && expr.type === 'object' && expr.fields.length === 0) {
      return true;
    }

    if (isAssignable(expected.valueType, actual.valueType)) {
      return true;
    }
  }

  if (expected.type === 'array' && actual.type === 'array') {

    if (expr && expr.type === 'array' && expr.items.length === 0) {
      return true;
    }

    if (isAssignable(expected.itemType, actual.itemType)) {
      return true;
    }
  }

  if (expected.type === 'basic' && expected.name === 'readable') {
    // readable = string should ok
    if (actual.type === 'basic' && actual.name === 'string') {
      return true;
    }

    // readable = bytes should ok
    if (actual.type === 'basic' && actual.name === 'bytes') {
      return true;
    }
  }

  if (expected.type === 'basic' && expected.name === 'any') {
    // any = other type
    return true;
  }

  if (expected.type === 'module_instance' && actual.type === 'module_instance') {
    if (actual.parentModuleIds.includes(expected.name)) {
      // basicModule = new derivedModule
      return true;
    }
  }

  return false;
}


function eql(expects, actuals) {
  if (expects.length !== actuals.length) {
    return false;
  }

  for (var i = 0; i < expects.length; i++) {
    const expect = expects[i];
    const actual = actuals[i];

    if (isSameType(expect, actual)) {
      continue;
    }

    if (isSameNumber(expect, actual)) {
      continue;
    }

    // actual is null
    if (actual.type === 'basic' && actual.name === 'null') {
      continue;
    }

    // $Model vs model
    if (expect.type === 'model' && expect.name === '$Model' && actual.type === 'model') {
      continue;
    }

    if (expect.type === 'map' && expect.keyType.name === 'string') {
      // expect: object
      // actual: model
      if (actual.type === 'model') {
        continue;
      }
    }

    if (expect.type === 'basic' && actual.type === 'basic') {
      if (expect.name === 'integer' && actual.name === 'number') {
        continue;
      }

      if (expect.name === 'long' && actual.name === 'number') {
        continue;
      }
    }

    if (expect.type === 'basic' && expect.name === 'any') {
      // expect: any
      continue;
    }

    // Model vs object
    if (expect.type === 'model' && actual.type === 'map') {
      continue;
    }

    // Model vs any
    if (expect.type === 'model' && actual.type === 'basic' && actual.name === 'any') {
      continue;
    }

    if (expect.type !== actual.type) {
      return false;
    }

    const type = expect.type;

    if (type === 'map') {
      if (expect.keyType.name === actual.keyType.name) {
        if (expect.valueType.name === 'any') {
          // map[string]any vs map[string]string
          continue;
        }
        if (isAssignable(expect.valueType, actual.valueType)) {
          continue;
        }
      }
    }
    
    if (type === 'array') {
      if (expect.itemType.name === 'any') {
        // [any] vs [string] 
        continue;
      }
      if (isAssignable(expect.itemType, actual.itemType)) {
        continue;
      }
    }

    return false;
  }

  return true;
}

// map to model
function isNeedToModel(expect, actual) {
  if (isSameType(expect, actual)) {
    return false;
  }

  if (actual.type === 'basic' && actual.name === 'null') {
    return false;
  }

  if (expect.type !== 'model') {
    return false;
  }

  return true;
}

// model to map
function isNeedToMap(expect, actual) {
  if (isSameType(expect, actual)) {
    return false;
  }

  if (actual.type === 'basic' && actual.name === 'null') {
    // model vs null
    if (expect.type === 'model') {
      return false;
    }
  }

  if (actual.type !== 'model') {
    // only model can't be cast
    return false;
  }

  if (expect.type === 'model' && expect.name === '$Model' && actual.type === 'model') {
    return false;
  }

  return true;
}

function findProperty(model, propName) {
  return model.modelBody.nodes.find((item) => {
    return item.fieldName.lexeme === propName;
  });
}

class TypeChecker {
  constructor(source, filename, root, libraries) {
    this.source = source;
    this.filename = filename;
    // 方法: apis、functions
    this.methods = new Map();
    // 属性
    this.typedefs = new Map();
    // 属性
    this.properties = new Map();
    // 模型
    this.models = new Map();
    // 枚举
    this.enums = new Map();
    // 依赖
    this.dependencies = new Map();
    //执行编译的root
    if (!root) {
      this.root = path.dirname(this.filename);
    } else {
      this.root = root;
    }
    //libraries依赖安装路径表
    if (!libraries) {
      const lockFilePath = path.join(this.root, '.libraries.json');
      if (fs.existsSync(lockFilePath)) {
        this.libraries = JSON.parse(fs.readFileSync(lockFilePath, 'utf-8'));
      } else {
        this.libraries = {};
      }
    } else {
      this.libraries = libraries;
    }
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

  checkModels(ast) {
    const models = ast.moduleBody.nodes.filter((item) => {
      return item.type === 'model';
    });
    models.forEach((node) => {
      const key = node.modelName.lexeme;
      // 重复定义检查
      if (this.models.has(key)) {
        this.error(`redefined model "${key}"`, node.modelName);
      }
      this.models.set(key, node);
    });

    // 允许先使用，后定义，所以先全部设置到 types 中，再进行检查
    models.forEach((node) => {
      this.visitModel(node);
    });
  }

  checkEnum(ast) {
    const enums = ast.moduleBody.nodes.filter((item) => {
      return item.type === 'enum';
    });
    enums.forEach((node) => {
      const key = node.enumName.lexeme;
      // 重复定义检查
      if (this.enums.has(key)) {
        this.error(`redefined enum "${key}"`, node.enumName);
      }
      this.enums.set(key, node);
    });

    enums.forEach((node) => {
      this.visitEnum(node);
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
        this.error(`redefined type "${key}"`, node.vid);
      }
      this.properties.set(key, node);
      this.vidCounter.set(key, 0);
    });
  }

  checkAPIs(ast) {
    ast.moduleBody.nodes.forEach((item) => {
      if (item.type === 'api') {
        this.visitAPI(item);
      }
    });
  }

  checkFunctions(ast) {
    ast.moduleBody.nodes.forEach((item) => {
      if (item.type === 'function') {
        this.visitFun(item);
      }
    });
  }

  checkInit(ast) {
    const inits = ast.moduleBody.nodes.filter((item) => {
      return item.type === 'init';
    });

    if (inits.length > 1) {
      this.error('Only one init can be allowed.', inits[1]);
    }
  }

  postCheckInit(ast) {
    const api = ast.moduleBody.nodes.find((item) => {
      return item.type === 'api';
    });
    const func = ast.moduleBody.nodes.find((item) => {
      // non-static function
      return item.type === 'function' && item.isStatic === false;
    });

    const init = ast.moduleBody.nodes.find((item) => {
      return item.type === 'init';
    });

    if (api || func) {
      if (!init && !this.parentModuleId) {
        this.error('Must have a init when there is a api or non-static function');
      }
    }

    if (init) {
      const paramMap = this.visitParams(init.params, {
        needValidateParams: true
      });

      if (init.initBody) {
        const local = new Env();
        // merge the parameters into local env
        for (const [key, value] of paramMap) {
          local.set(key, value);
        }
        const env = {
          isStatic: false,
          isAsync: false,
          isInitMethod: true,
          local: local
        };
        this.visitStmts(init.initBody, env);
      }
    }
    this.init = init;
  }

  checkExtends(ast) {
    if (!ast.extends) {
      return;
    }

    const aliasId = ast.extends.lexeme;
    if (!this.dependencies.has(aliasId)) {
      this.error(`the extends "${aliasId}" wasn't imported`, ast.extends);
    }

    this.parentModuleId = aliasId;
  }

  checkImports(ast) {
    if (ast.imports.length === 0) {
      return;
    }

    const filePath = this.filename;
    const pkgDir = path.dirname(filePath);
    const pkgPath = getDarafile(pkgDir);
    if (!fs.existsSync(pkgPath)) {
      this.error(`the Darafile not exists`);
    }

    const pkg = JSON.parse(stripComments(fs.readFileSync(pkgPath, 'utf-8')));
    pkg.libraries = pkg.libraries || {};

    for (let i = 0; i < ast.imports.length; i++) {
      const item = ast.imports[i];
      const aliasId = item.lexeme;

      if (!pkg.libraries[aliasId] && pkg.name !== aliasId) {
        this.error(`the import "${aliasId}" not defined in Darafile`, item);
      }

      if (this.dependencies.has(aliasId)) {
        this.error(`the module id "${aliasId}" has been imported`, item);
      }

      const specPath = pkg.libraries[aliasId] || pkg.main;
      let realSpecPath;
      if (specPath.startsWith('./') || specPath.startsWith('../')) {
        if (specPath.endsWith('.dara') || specPath.endsWith('.tea') || specPath.endsWith('.spec')) {
          realSpecPath = path.join(pkgDir, specPath);
        } else {
          const libMetaPath = getDarafile(path.join(pkgDir, specPath));
          const libMeta = JSON.parse(stripComments(fs.readFileSync(libMetaPath, 'utf-8')));
          realSpecPath = path.join(pkgDir, specPath, libMeta.main);
        }
      } else {
        const key = `${specPath}`;
        if (!this.libraries[key]) {
          this.error(`the module id "${aliasId}" has not installed, use \`dara install\` first`, item);
        }
        const libPath = path.join(this.root, this.libraries[key]);
        const libMetaPath = getDarafile(libPath);
        const libMeta = JSON.parse(stripComments(fs.readFileSync(libMetaPath, 'utf-8')));
        realSpecPath = path.join(libPath, libMeta.main);
      }
      const source = fs.readFileSync(realSpecPath, 'utf-8');
      const lexer = new Lexer(source, realSpecPath);
      const parser = new Parser(lexer);
      const depAst = parser.program();
      const checker = new TypeChecker(source, realSpecPath, this.root, this.libraries).check(depAst);
      this.dependencies.set(aliasId, checker);
      this.usedExternModel.set(aliasId, new Set());
    }
  }

  check(ast) {
    assert.equal(ast.type, 'module');
    // 类型系统
    this.usedExternModel = new Map();
    this.usedTypes = new Map();
    this.checkImports(ast);
    this.checkExtends(ast);
    // typedef check
    this.checkTypedefs(ast);
    this.checkConsts(ast);
    // enums
    this.checkEnum(ast);
    // models & sub-models
    this.checkModels(ast);
    // virtual variables & virtual methods
    this.checkTypes(ast);
    // Check module init
    this.checkInit(ast);
    this.preCheckMethods(ast);
    // apis
    this.checkAPIs(ast);
    // functions
    this.checkFunctions(ast);
    // post check for init: if have any apis or non-static function, must have init
    this.postCheckInit(ast);
    // check unused virtualVariable & virtualMethod
    this.postCheckTypes(ast);
    ast.models = {};
    for (var [key, value] of this.models) {
      ast.models[key] = value;
    }
    ast.usedExternModel = this.usedExternModel;
    ast.conflictModels = this.resolveConflictModels(ast.usedExternModel);
    ast.usedTypes = this.usedTypes;
    // save the final ast in checker
    this.ast = ast;
    return this;
  }

  resolveConflictModels(usedExternModel) {
    var conflicts = new Map();
    var names = new Map();
    for (const [name] of this.models) {
      names.set(name, '');
    }
    for (const [moduleName, models] of usedExternModel) {
      for (var name of models) {
        if (names.has(name)) {
          conflicts.set(`${moduleName}:${name}`, true);
          const conflictModule = names.get(name);
          if (conflictModule) {
            conflicts.set(`${conflictModule}:${name}`, true);
          } else {
            conflicts.set(name, true);
          }
          
        }
        names.set(name, moduleName);
      }
    }
    return conflicts;
  }

  checkTypedefs(ast) {
    ast.moduleBody.nodes.filter((item) => {
      return item.type === 'typedef';
    }).forEach((node) => {
      const key = node.value.lexeme;
      if (this.typedefs.has(key)) {
        // 重复定义检查
        this.error(`redefined typedef "${key}"`, node.value);
      }
      this.typedefs.set(key, node);
    });
  }

  checkConsts(ast) {
    this.consts = new Map();
    ast.moduleBody.nodes.filter((item) => {
      return item.type === 'const';
    }).forEach((node) => {
      const tag = node.constValue.tag;
      let type;
      switch (tag) {
      case Tag.STRING:
        type = 'string';
        break;
      case Tag.NUMBER:
        type = 'number';
        break;
      case Tag.BOOL:
        type = 'boolean';
        break;
      }
      this.consts.set(node.constName.lexeme, {
        type,
        value: node.constValue
      });
    });
  }

  postCheckTypes(ast) {
    if (process.env.TEA_WARNING === '1') {
      for (const [key, value] of this.vidCounter) {
        if (value === 0) {
          console.log(`the type ${key} is unused.`);
        }
      }
    }
  }

  preCheckMethods(ast) {
    ast.moduleBody.nodes.forEach((node) => {
      if (node.type === 'api') {
        const key = node.apiName.lexeme;
        // 重复定义检查
        if (this.methods.has(key)) {
          this.error(`redefined api "${key}"`, node.apiName);
        }
        this.methods.set(key, node);
      } else if (node.type === 'function') {
        const key = node.functionName.lexeme;
        // 重复定义检查
        if (this.methods.has(key)) {
          this.error(`redefined function "${key}"`, node.functionName);
        }

        this.methods.set(key, node);
      }
    });
  }

  visitFun(ast) {
    assert.equal(ast.type, 'function');
    const paramMap = this.visitParams(ast.params, {});
    this.checkType(ast.returnType);

    const returnType = ast.returnType;
    if (ast.functionBody) {
      const local = new Env();
      // merge the parameters into local env
      for (const [key, value] of paramMap) {
        local.set(key, value);
      }
      const env = {
        returnType,
        isStatic: ast.isStatic,
        isAsync: ast.isAsync,
        local: local
      };
      this.visitFunctionBody(ast.functionBody, env);

      if (returnType.tag === Tag.TYPE && returnType.lexeme === 'void') {
        // no check for void
        return;
      }

      if (!this.hasReturnStmt(ast.functionBody.stmts)) {
        this.error(`no return statement`, ast.functionName);
      }
    }
  }

  visitFunctionBody(ast, env) {
    assert.equal(ast.type, 'functionBody');
    this.visitStmts(ast.stmts, env);
  }

  hasReturnStmt(ast) {
    assert.equal(ast.type, 'stmts');

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
      if (!this.hasReturnStmt(stmt.stmts)) {
        return false;
      }

      for (let index = 0; index < stmt.elseIfs.length; index++) {
        const branch = stmt.elseIfs[index];
        if (!this.hasReturnStmt(branch.stmts)) {
          return false;
        }
      }

      if (!stmt.elseStmts) {
        return false;
      }

      if (!this.hasReturnStmt(stmt.elseStmts)) {
        return false;
      }

      return true;
    }

    
    
    if (stmt.type === 'try') {
      let tryReturn = true;
      let catchReturn = true;
      let finallyReturn = true;
      if (!this.hasReturnStmt(stmt.tryBlock)) {
        tryReturn = false;
      }

      if (stmt.catchBlock && !this.hasReturnStmt(stmt.catchBlock)) {
        catchReturn = false;
      }

      if (!stmt.finallyBlock || !this.hasReturnStmt(stmt.finallyBlock)) {
        finallyReturn = false;
      }

      if (finallyReturn) {
        return true;
      }

      if (!tryReturn) {
        return false;
      }

      if (!catchReturn) {
        return false;
      }

      return true;
    }
    
    // TODO: while, for
    if (stmt.type === 'while') {
      return true;
    }

    if (stmt.type === 'for') {
      return true;
    }

    return false;
  }

  visitAPI(ast) {
    assert.equal(ast.type, 'api');
    const paramMap = this.visitParams(ast.params, {
      needValidateParams: true
    });
    this.checkType(ast.returnType);
    const returnType = ast.returnType;
    const local = new Env();
    // merge the parameters into local env
    for (const [key, value] of paramMap) {
      local.set(key, value);
    }
    const env = {
      returnType,
      isAsync: true,
      local: local
    };
    if (ast.runtimeBody) {
      this.visitObject(ast.runtimeBody, env);
    }
    env.local.set('__request', _model('$Request'));
    this.visitAPIBody(ast.apiBody, env);

    ast.isAsync = true;
    if (ast.returns) {
      env.inReturnsBlock = true;
      env.local.set('__response', _model('$Response'));
      this.visitReturnBody(ast.returns, env);
      if (returnType.tag === Tag.TYPE && returnType.lexeme === 'void') {
        // no check for void
        return;
      }

      if (!this.hasReturnStmt(ast.returns.stmts)) {
        this.error(`no return statement`, ast.apiName);
      }
    }
  }

  visitParams(ast, env) {
    assert.equal(ast.type, 'params');
    const paramMap = new Map();
    for (var i = 0; i < ast.params.length; i++) {
      const node = ast.params[i];
      assert.equal(node.type, 'param');
      const name = node.paramName.lexeme;
      if (paramMap.has(node.paramName.lexeme)) {
        // 重复参数名检查
        this.error(`redefined parameter "${name}"`, node.paramName);
      }
      this.checkType(node.paramType);

      // TODO: 默认值类型检查
      const type = this.getType(node.paramType);
      paramMap.set(name, type);
      if (type.type === 'model' && env.needValidateParams) {
        node.needValidate = true;
      }
    }

    return paramMap;
  }



  checkType(node) {
    if (node.type === 'array') {
      this.checkType(node.subType);
      return;
    }

    if (node.type === 'map') {
      this.checkType(node.valueType);
      return;
    }

    if (node.tag === Tag.TYPE) {
      this.usedTypes.set(node.lexeme, true);
      return;
    }

    const modelName = node.lexeme;
    if (node.tag === Tag.ID) {
      const idType = this.getIdType(modelName);
      if (idType) {
        node.idType = idType;
        return;
      }


      this.error(`model "${modelName}" undefined`, node);
    }

    if (node.type === 'subModel_or_moduleModel') {
      const [mainId, ...rest] = node.path;
      const idType = this.getIdType(mainId.lexeme);
      mainId.idType = idType;
      // submodel
      if (idType === 'model') {
        const typeName = node.path.map((item) => {
          return item.lexeme;
        }).join('.');
        if (!this.models.has(typeName)) {
          this.error(`the submodel ${typeName} is inexist`, mainId);
        }
        node.type = 'subModel';
        return;
      }

      if (idType === 'module') {
        const checker = this.dependencies.get(mainId.lexeme);
        const typeName = rest.map((item) => {
          return item.lexeme;
        }).join('.');
        if (checker.models.has(typeName)) {
          node.type = 'moduleModel';
          this.usedExternModel.get(mainId.lexeme).add(typeName);
        } else if (checker.enums.has(typeName)) {
          node.type = 'moduleEnum';
          this.usedExternModel.get(mainId.lexeme).add(typeName);
        } else if (checker.typedefs.has(typeName)) {
          node.type = 'moduleTypedef';
          this.usedExternModel.get(mainId.lexeme).add(typeName);
        } else {
          this.error(`the model ${typeName} is inexist in ${mainId.lexeme}`, mainId);
        }
        
        return;
      }
    }

  }

  visitAPIBody(ast, env) {
    assert.equal(ast.type, 'apiBody');
    for (let i = 0; i < ast.stmts.stmts.length; i++) {
      this.visitStmt(ast.stmts.stmts[i], env);
    }
  }

  visitStmt(ast, env) {
    if (ast.type === 'return') {
      this.visitReturn(ast, env);
    } else if (ast.type === 'if') {
      this.visitIf(ast, env);
    } else if (ast.type === 'throw') {
      this.visitThrow(ast, env);
    } else if (ast.type === 'assign') {
      this.visitAssign(ast, env);
    } else if (ast.type === 'retry') {
      if (!env.inReturnsBlock) {
        this.error(`retry only can be in returns block`, ast);
      }
    } else if (ast.type === 'break') {
      // unnecessary to check
    } else if (ast.type === 'declare') {
      this.visitDeclare(ast, env);
    } else if (ast.type === 'try') {
      this.visitTry(ast, env);
    } else if (ast.type === 'while') {
      this.visitWhile(ast, env);
    } else if (ast.type === 'for') {
      this.visitFor(ast, env);
    } else {
      this.visitExpr(ast, env);
    }
  }

  visitFor(ast, env) {
    assert.equal(ast.type, 'for');
    env.local = new Env(env.local);
    this.visitExpr(ast.list, env);
    const listType = this.getExprType(ast.list, env);
    if (listType.type !== 'array') {
      this.error(`the list in for must be array type`, ast.list);
    }
    env.local.set(ast.id.lexeme, listType.itemType);
    this.visitStmts(ast.stmts, env);
    env.local = env.local.preEnv;
  }

  isBooleanType(expr, env) {
    const type = this.getExprType(expr, env);
    return type.type === 'basic' && type.name === 'boolean';
  }

  isStringType(expr, env) {
    const type = this.getExprType(expr, env);
    return type.type === 'basic' && type.name === 'string';
  }

  isNumberType(expr, env) {
    const type = this.getExprType(expr, env);
    return type.type === 'basic' && isNumber(type.name);
  }

  visitWhile(ast, env) {
    assert.equal(ast.type, 'while');
    env.local = new Env(env.local);
    this.visitExpr(ast.condition, env);
    if (!this.isBooleanType(ast.condition, env)) {
      this.error(`the condition expr must be boolean type`, ast.condition);
    }
    this.visitStmts(ast.stmts, env);
    env.local = env.local.preEnv;
  }

  visitTry(ast, env) {
    assert.equal(ast.type, 'try');
    this.visitStmts(ast.tryBlock, env);
    if (ast.catchBlock) {
      // create new local
      var local = new Env(env.local);
      local.set(ast.catchId.lexeme, _model('$Error'));
      env.local = local;
      this.visitStmts(ast.catchBlock, env);
      // restore the local
      env.local = env.local.preEnv;
    }

    if (ast.finallyBlock) {
      this.visitStmts(ast.finallyBlock, env);
    }
  }

  getParameterType(type, moduleName) {
    if (type.tag === Tag.TYPE && type.lexeme === 'object') {
      return {
        type: 'map',
        keyType: _basic('string'),
        valueType: _basic('any')
      };
    } else if (type.type === 'map') {
      return {
        type: 'map',
        keyType: _basic('string'),
        valueType: this.getParameterType(type.valueType, moduleName)
      };
    } else if (type.tag === Tag.TYPE) {
      return _basic(type.lexeme);
    } else if (type.tag === Tag.ID && type.lexeme.startsWith('$')) {
      return _model(type.lexeme);
    } else if (type.tag === Tag.ID && type.idType === 'model') {
      return _model(type.lexeme, moduleName);
    } else if (type.tag === Tag.ID && this.dependencies.has(type.lexeme)) {
      return {
        type: 'module_instance',
        name: type.lexeme
      };
    } else if (type.tag === Tag.ID && type.idType === 'typedef') {
      return _typedef(type.lexeme, moduleName);
    } else if (type.tag === Tag.ID) {
      return _model(type.lexeme);
    } else if (
      type.type === 'moduleModel' ||
      type.type === 'subModel' || 
      type.type === 'subModel_or_moduleModel') {
      if (moduleName && type.type === 'subModel') {
        return _model(type.path.map((item) => {
          return item.lexeme;
        }).join('.'), moduleName);
      }
      const [mainId, ...rest] = type.path;
      const idType = this.getIdType(mainId.lexeme);
      if (idType === 'module') {
        const checker = this.dependencies.get(mainId.lexeme);
        const typeName = rest.map((item) => {
          return item.lexeme;
        }).join('.');
        if (checker.models.has(typeName)) {
          return _model(rest.map((item) => {
            return item.lexeme;
          }).join('.'), mainId.lexeme);
        } else if (checker.enums.has(typeName)) {
          return _enum(rest.map((item) => {
            return item.lexeme;
          }).join('.'), mainId.lexeme);
        } else if (checker.typedefs.has(typeName)) {
          return _typedef(rest.map((item) => {
            return item.lexeme;
          }).join('.'), mainId.lexeme);
        }
        
      }

      if (idType === 'model') {
        return _model(type.path.map((item) => {
          return item.lexeme;
        }).join('.'));
      }
      
    } else if (type.type === 'moduleTypedef') {
      const [mainId, ...rest] = type.path;
      return _typedef(rest.map((item) => {
        return item.lexeme;
      }).join('.'), mainId.lexeme);
    } else if (type.type === 'array') {
      return {
        type: 'array',
        itemType: this.getParameterType(type.subType, moduleName)
      };
    }

    console.log(type);
    throw new Error('un-implemented');
  }

  getParameterTypes(def, moduleName) {
    const expected = [];
    const params = def.params.params;
    for (let i = 0; i < params.length; i++) {
      expected.push(this.getParameterType(params[i].paramType, moduleName));
    }
    return expected;
  }

  visitStaticCall(ast, env) {
    assert.equal(ast.left.type, 'static_call');
    const moduleId = ast.left.id;
    const moduleName = moduleId.lexeme;
    const checker = this.dependencies.get(moduleName);
    const method = ast.left.propertyPath[0];
    const methodName = method.lexeme;

    const def = checker.methods.get(methodName);
    if (!def) {
      this.error(`the static function "${methodName}" is undefined in ${moduleName}`, method);
    }

    if (!def.isStatic) {
      this.error(`the "${methodName}" is not static function`, method);
    }

    const expected = this.getParameterTypes(def, moduleName);

    const actual = [];
    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      this.visitExpr(arg, env);
      const type = this.getExprType(arg, env);
      actual.push(type);
    }

    if (!eql(expected, actual)) {
      this.error(`the parameter` +
        ` types are mismatched. expected ` +
        `${moduleName}.${methodName}(${expected.map((item) => display(item)).join(', ')}), but ` +
        `${moduleName}.${methodName}(${actual.map((item) => display(item)).join(', ')})`, method);
    }

    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      arg.expectedType = expected[i];
      arg.needCast = isNeedToMap(expected[i], arg.inferred);
    }

    ast.isAsync = def.isAsync;
    ast.isStatic = def.isStatic;
    ast.hasThrow = def.isAsync || def.hasThrow;
    ast.inferred = this.getType(def.returnType, moduleName);
  }

  getIdType(id) {
    // 不检查普通变量，仅作为类型时的检查
    if (this.models.has(id)) {
      return 'model';
    } else if (this.dependencies.has(id)) {
      return 'module';
    } else if (builtin.has(id)) {
      return 'builtin_model';
    } else if (this.enums.has(id)) {
      return 'enum';
    } else if (this.typedefs.has(id)) {
      return 'typedef';
    }
    return '';
  }

  checkId(id, env) {
    if (id.tag === Tag.VID) {
      return this.checkVid(id, env);
    }

    // 未定义变量检查
    const name = id.lexeme;

    if (env.local && env.local.hasDefined(name)) {
      // 是否在作用域链上定义过
      id.type = 'variable';
      return;
    }

    if (this.models.has(name)) {
      id.type = 'model';
      // model 类型
      return;
    }

    if (this.dependencies.has(name)) {
      // alias 
      id.type = 'module';
      return;
    }

    if (this.enums.has(name)) {
      // alias 
      id.type = 'enum';
      return;
    }
    this.error(`variable "${name}" undefined`, id);
  }

  getChecker(moduleName) {
    if (this.dependencies.has(moduleName)) {
      return this.dependencies.get(moduleName);
    }

    let current = this;
    while (current && current.parentModuleId) {
      current = this.dependencies.get(current.parentModuleId);

      if (current.dependencies.has(moduleName)) {
        return current.dependencies.get(moduleName);
      }
    }

    return null;
  }

  getParentModuleIds(moduleName) {
    let current = this.dependencies.get(moduleName);
    const parentModuleIds = [];
    while (current && current.parentModuleId) {
      parentModuleIds.push(current.parentModuleId);
      current = current.dependencies.get(current.parentModuleId);
    }

    return parentModuleIds;
  }

  getInstanceProperty(vid) {
    let current = this;
    if (current.properties.has(vid)) {
      // check B
      return current.properties.get(vid);
    }

    while (current.parentModuleId) {
      current = current.dependencies.get(current.parentModuleId);
      // check C, D, E
      if (current.properties.has(vid)) {
        return current.properties.get(vid);
      }
    }

    return null;
  }

  getArrayFiledType(field, modelName, moduleName) {
    if (field.fieldItemType.tag === Tag.TYPE) {
      return {
        type: 'array',
        itemType: _basic(field.fieldItemType.lexeme)
      };
    }
    // for filed: [{}]
    if (field.fieldItemType.type === 'modelBody') {
      return {
        type: 'array',
        itemType: _model(modelName, moduleName)
      };
    }
    // for filed: [[]]
    if (field.fieldItemType.fieldType === 'array') {
      return {
        type: 'array',
        itemType: this.getArrayFiledType(field.fieldItemType, modelName, moduleName)
      };
    }

    return {
      type: 'array',
      itemType: _model(field.fieldItemType.lexeme, moduleName)
    };
  }

  getFieldType(find, modelName, moduleName) {
    if (find.fieldValue.fieldType === 'map') {
      if (find.fieldValue.valueType.idType === 'model') {
        return {
          type: 'map',
          keyType: _basic(find.fieldValue.keyType.lexeme),
          valueType: _model(find.fieldValue.valueType.lexeme, moduleName)
        };
      }
      return {
        type: 'map',
        keyType: _basic(find.fieldValue.keyType.lexeme),
        valueType: _basic(find.fieldValue.valueType.lexeme)
      };
    }

    if (find.fieldValue.type === 'modelBody') {
      return _model([modelName, find.fieldName.lexeme].join('.'), moduleName);
    }

    if (find.fieldValue.fieldType === 'array') {
      return this.getArrayFiledType(find.fieldValue, find.fieldValue.itemType, moduleName);
    }

    if (find.fieldValue.fieldType.tag === Tag.ID) {
      const id = find.fieldValue.fieldType.lexeme;
      if (this.models.has(id)) {
        return _model(id);
      }

      if (this.dependencies.has(id)) {
        return {
          type: 'module_instance',
          name: id
        };
      }

      if (this.enums.has(id)) {
        return _enum(id);
      }

      if (this.typedefs.has(id)) {
        return _typedef(id);
      }

      return _model(find.fieldValue.fieldType.lexeme, moduleName);
    }

    if (find.fieldValue.fieldType.type === 'moduleModel') {
      const [mainId, ...rest] = find.fieldValue.fieldType.path;
      let filedName = rest.map((tag) => {
        return tag.lexeme;
      }).join('.');
      return _model(filedName, mainId.lexeme);
    }

    if (find.fieldValue.fieldType.type === 'moduleEnum') {
      const [mainId, ...rest] = find.fieldValue.fieldType.path;
      let filedName = rest.map((tag) => {
        return tag.lexeme;
      }).join('.');
      return _enum(filedName, mainId.lexeme);
    }

    if (find.fieldValue.fieldType.type === 'moduleTypedef') {
      const [mainId, ...rest] = find.fieldValue.fieldType.path;
      let filedName = rest.map((tag) => {
        return tag.lexeme;
      }).join('.');
      return _typedef(filedName, mainId.lexeme);
    }

    if (find.fieldValue.fieldType.type === 'subModel') {
      let modelName = find.fieldValue.fieldType.path.map((tag) => {
        return tag.lexeme;
      }).join('.');
      return _model(modelName);
    }

    return _basic(find.fieldValue.fieldType);
  }

  getStaticMethod(name) {
    let method = this.methods.get(name);
    if (method && method.isStatic) {
      return { method };
    }

    return null;
  }

  getInstanceMethod(name, checkerName) {
    let current = this;
    if (current.methods.has(name)) {
      // check B
      let method = current.methods.get(name);
      if (!method.isStatic) {
        return {
          method,
          module: checkerName
        };
      }
    }

    while (current.parentModuleId) {
      let moduleName = current.parentModuleId;
      current = current.dependencies.get(moduleName);
      // check C, D, E
      if (current.methods.has(name)) {
        // check B
        let method = current.methods.get(name);
        if (!method.isStatic) {
          return {
            method,
            module: moduleName
          };
        }
      }
    }

    return null;
  }

  checkVid(vid, env) {
    const name = vid.lexeme;
    if (!this.getInstanceProperty(name)) {
      this.error(`the type "${name}" is undefined`, vid);
    }

    if (env.isStatic) {
      this.error(`virtual variable can not used in static function`, vid);
    }

    this.vidCounter.set(name, this.vidCounter.get(name) + 1);
  }

  checkProperty(ast, env) {
    if (ast.id.lexeme === '__module') {
      const [key] = ast.propertyPath;
      const target = this.consts.get(key.lexeme);
      if (!target) {
        this.error(`the const ${key.lexeme} is undefined`, key);
      }
      replace(ast, target);
      return;
    }

    this.checkId(ast.id, env);
    if (this.models.has(ast.id.lexeme)) {
      // submodel M.N
      let current = this.models.get(ast.id.lexeme);
      const currentPath = [ast.id.lexeme];
      for (let i = 0; i < ast.propertyPath.length; i++) {
        let prop = ast.propertyPath[i];
        currentPath.push(prop.lexeme);
        let find = findProperty(current, prop.lexeme);
        if (!find) {
          this.error(`The model ${currentPath.join('.')} is undefined`, prop);
        }
        current = find;
      }
      ast.realType = {
        type: 'class',
        name: currentPath.join('.')
      };
      return;
    }

    if (this.dependencies.has(ast.id.lexeme)) {
      // Alias.M.N
      return;
    }

    if (this.enums.has(ast.id.lexeme)) {
      // E.K
      return;
    }

    // check property
    const type = this.getVariableType(ast.id, env);
    ast.id.inferred = type;

    if (type.type === 'model' || type.type === 'map') {
      // { type: 'map', keyTypeName: 'string', valueTypeName: 'any' }
      const currentPath = [ast.id.lexeme];
      let current = type;
      ast.propertyPathTypes = new Array(ast.propertyPath.length);
      for (let i = 0; i < ast.propertyPath.length; i++) {
        let prop = ast.propertyPath[i];
        let find = this.getPropertyType(current, prop.lexeme);
        if (!find) {
          this.error(`The property ${prop.lexeme} is undefined ` +
            `in model ${currentPath.join('.')}(${current.name})`, prop);
        }
        ast.propertyPathTypes[i] = find;
        currentPath.push(prop.lexeme);
        current = find;
      }

      return;
    }

    const name = ast.id.lexeme;
    this.error(`The type of '${name}' must be model, object or map`, ast.id);
  }

  visitExpr(ast, env) {
    if (ast.type === 'string') {
      // noop();
    } else if (ast.type === 'number') {
      // noop();
    } else if (ast.type === 'boolean') {
      // noop();
    } else if (ast.type === 'null') {
      // noop();
    } else if (ast.type === 'property_access') {
      this.checkProperty(ast, env);
    } else if (ast.type === 'object') {
      this.visitObject(ast, env);
    } else if (ast.type === 'variable') {
      this.checkId(ast.id, env);
    } else if (ast.type === 'virtualVariable') {
      this.checkVid(ast.vid, env);
    } else if (ast.type === 'template_string') {
      for (var i = 0; i < ast.elements.length; i++) {
        var item = ast.elements[i];
        if (item.type === 'expr') {
          this.visitExpr(item.expr, env);
        }
      }
    } else if (ast.type === 'call') {
      this.visitCall(ast, env);
    } else if (ast.type === 'construct') {
      this.visitConstruct(ast, env);
    } else if (ast.type === 'construct_model') {
      this.visitConstructModel(ast, env);
    } else if (ast.type === 'array') {
      this.visitArray(ast, env);
    } else if (ast.type === 'and' || ast.type === 'or') {
      this.visitExpr(ast.left, env);
      // the expr type should be boolean
      if (!this.isBooleanType(ast.left, env)) {
        this.error(`the left expr must be boolean type`, ast.left);
      }
      this.visitExpr(ast.right, env);
      // the expr type should be boolean
      if (!this.isBooleanType(ast.right, env)) {
        this.error(`the right expr must be boolean type`, ast.right);
      }
    } else if (ast.type === 'not') {
      this.visitExpr(ast.expr, env);
      if (!this.isBooleanType(ast.expr, env)) {
        this.error(`the expr after ! must be boolean type`, ast.expr);
      }
    } else if (ast.type === 'super') {
      this.visitSuperCall(ast, env);
    } else if (ast.type === 'map_access') {
      let mainType;
      if (ast.propertyPath) {
        this.checkProperty(ast, env);
        mainType = this.calculatePropertyType(ast, env);
      } else {
        this.checkId(ast.id, env);
        mainType = this.getVariableType(ast.id, env);
      }

      this.visitExpr(ast.accessKey, env);

      if (mainType.type === 'map') {
        if (!this.isStringType(ast.accessKey, env)) {
          this.error(`The key expr type must be string type`, ast.accessKey);
        }
      } else if (mainType.type === 'array') {
        ast.type = 'array_access';
        if (!this.isNumberType(ast.accessKey, env)) {
          this.error(`The key expr type must be number type`, ast.accessKey);
        }
      } else {
        this.error(`the [] form only support map or array type`, ast.accessKey);
      }
    } else {
      throw new Error('unimplemented.');
    }
    ast.inferred = this.getExprType(ast, env);
  }

  visitSuperCall(ast, env) {
    if (!env.isInitMethod) {
      this.error(`super only allowed in init method`, ast);
    }

    if (!this.parentModuleId) {
      this.error(`this module have no parent module`, ast);
    }

    const parent = this.getChecker(this.parentModuleId);
    const expected = this.getParameterTypes(parent.init, this.parentModuleId);

    const actual = [];
    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      this.visitExpr(arg, env);
      const type = this.getExprType(arg, env);
      actual.push(type);
    }

    if (!eql(expected, actual)) {
      this.error(`the parameter` +
        ` types are mismatched. expected ` +
        `${this.parentModuleId}(${expected.map((item) => display(item)).join(', ')}), but ` +
        `${this.parentModuleId}(${actual.map((item) => display(item)).join(', ')})`, ast);
    }

    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      arg.needCast = isNeedToMap(expected[i], arg.inferred);
      arg.expectedType = expected[i];
    }
  }

  checkConstructModelFields(ast, model, modelName, env) {
    if (!ast.object) {
      return;
    }

    const aliasId = ast.aliasId.lexeme;
    this.visitObject(ast.object, env);

    for (let i = 0; i < ast.object.fields.length; i++) {
      const field = ast.object.fields[i];
      const name = field.fieldName.lexeme;
      const modelField = findProperty(model, name);
      if (!modelField) {
        this.error(`the property "${name}" is undefined in model "${aliasId}.${modelName}"`, field.fieldName);
      }

      const type = this.getExprType(field.expr, env);
      let expected;
      if (ast.aliasId.isModel) {
        expected = this.getFieldType(modelField, modelName);
      } else {
        expected = this.getFieldType(modelField, modelName, aliasId);
      }
      if (!eql([expected], [type])) {
        this.error(`the field type are mismatched. expected ` +
          `${display(expected)}, but ${display(type)}`, field.fieldName);
      }
      field.inferred = type;
      field.expectedType = expected;
    }
  }

  visitConstructModel(ast, env) {
    const aliasId = ast.aliasId.lexeme;
    if (this.dependencies.has(aliasId)) {
      ast.aliasId.isModule = true;
      const checker = this.dependencies.get(aliasId);
      const modelId = ast.propertyPath.map((item) => {
        return item.lexeme;
      }).join('.');
      const model = checker.models.get(modelId);
      if (!model) {
        this.error(`the model "${modelId}" is undefined in module "${aliasId}"`, ast.propertyPath[0]);
      }

      this.usedExternModel.get(aliasId).add(modelId);
      this.checkConstructModelFields(ast, model, `${modelId}`, env);
      return;
    }

    if (this.models.has(aliasId)) {
      const model = this.models.get(aliasId);
      ast.aliasId.isModel = true;
      if (ast.propertyPath.length === 0) {
        this.checkConstructModelFields(ast, model, aliasId, env);
        return;
      }

      const fullPath = [aliasId, ...ast.propertyPath.map((item) => {
        return item.lexeme;
      })];

      for (let i = 1; i < fullPath.length; i++) {
        const subModelName = fullPath.slice(0, i + 1).join('.');
        if (!this.models.has(subModelName)) {
          this.error(`the model "${subModelName}" is undefined`, ast.propertyPath[i]);
        }
      }

      const modelName = fullPath.join('.');
      const subModel = this.models.get(modelName);
      this.checkConstructModelFields(ast, subModel, modelName, env);
      return;
    }

    this.error(`expected "${aliasId}" is module or model`, ast.aliasId);
  }

  visitCall(ast, env) {
    assert.ok(ast.type === 'call');
    if (ast.left.type === 'method_call') {
      this.visitMethodCall(ast, env);
      return;
    }

    // need fix the type by id type
    if (ast.left.type === 'static_or_instance_call') {
      const id = ast.left.id;
      this.checkId(id, env);
      if (env.local.hasDefined(id.lexeme)) {
        ast.left.type = 'instance_call';
        this.visitInstanceCall(ast, env);
        return;
      }

      if (this.dependencies.has(id.lexeme)) {
        ast.left.type = 'static_call';
        this.visitStaticCall(ast, env);
        return;
      }

      if (id.tag === Tag.VID) {
        this.checkVid(id, env);
        const type = this.getVariableType(ast.left.id, env);
        if (type.type === 'module_instance') {
          ast.left.type = 'instance_call';
          this.visitInstanceCall(ast, env);
          return;
        }
      }
    }

    throw new Error('un-implemented');
  }

  visitInstanceCall(ast, env) {
    assert.equal(ast.left.type, 'instance_call');
    let moduleName;
    if (ast.left.id.type === Tag.ID) {
      const moduleType = env.local.get(ast.left.id.lexeme);
      moduleName = moduleType.name;
    } else {
      const type = this.getVariableType(ast.left.id, env);
      moduleName = type.name;
    }

    const checker = this.getChecker(moduleName);
    const method = ast.left.propertyPath[0];
    const name = method.lexeme;
    const def = checker.getInstanceMethod(name, moduleName);
    if (!def) {
      this.error(`the instance function/api "${name}" is undefined in ${moduleName}`, method);
    }

    const { method: definedApi, module: moduleNameOfDef } = def;

    const actual = [];
    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      this.visitExpr(arg, env);
      const type = this.getExprType(arg, env);
      actual.push(type);
    }

    const expected = this.getParameterTypes(definedApi, moduleNameOfDef);

    if (!eql(expected, actual)) {
      this.error(`the parameter` +
        ` types are mismatched. expected ` +
        `${moduleName}.${name}(${expected.map((item) => display(item)).join(', ')}), but ` +
        `${moduleName}.${name}(${actual.map((item) => display(item)).join(', ')})`, method);
    }

    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      arg.needCast = isNeedToMap(expected[i], arg.inferred);
      arg.expectedType = expected[i];
    }

    ast.inferred = this.getType(definedApi.returnType, moduleName);
    ast.isAsync = definedApi.isAsync;
    ast.isStatic = definedApi.isStatic;
    ast.hasThrow = definedApi.isAsync || definedApi.hasThrow;
  }

  visitMethodCall(ast, env) {
    assert.equal(ast.left.type, 'method_call');
    const id = ast.left.id;
    const name = id.lexeme;
    const staticMethod = this.getStaticMethod(name);
    const instanceMethod = this.getInstanceMethod(name);
    const defined = staticMethod || instanceMethod;
    if (!defined) {
      this.error(`the api/function "${name}" is undefined`, id);
    }

    const { method: definedApi, module: moduleName } = defined;

    if (definedApi.type === 'api' && !env.isAsync) {
      this.error(`the api only can be used in async function`, id);
    }

    if (definedApi.type === 'function') {
      if (!env.isAsync && definedApi.isAsync) {
        this.error(`the async function only can be used in async function`, id);
      }
    }

    if (ast.args.length !== definedApi.params.params.length) {
      this.error(`the parameters are mismatched, expect ${definedApi.params.params.length} ` +
        `parameters, actual ${ast.args.length}`, id);
    }

    const expected = this.getParameterTypes(definedApi, moduleName);

    const actual = [];
    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      this.visitExpr(arg, env);
      const type = this.getExprType(arg, env);
      actual.push(type);
    }

    if (!eql(expected, actual)) {
      this.error(`the parameter` +
        ` types are mismatched. expected ` +
        `${name}(${expected.map((item) => display(item)).join(', ')}), but ` +
        `${name}(${actual.map((item) => display(item)).join(', ')})`, id);
    }

    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      arg.needCast = isNeedToMap(expected[i], arg.inferred);
      arg.expectedType = expected[i];
    }

    ast.isStatic = definedApi.type === 'api' ? false : definedApi.isStatic;
    ast.isAsync = definedApi.type === 'api' ? true : definedApi.isAsync;
    ast.inferred = this.getType(definedApi.returnType);
    ast.hasThrow = ast.isAsync || definedApi.hasThrow;
  }

  visitConstruct(ast, env) {
    const aliasId = ast.aliasId.lexeme;
    if (!this.dependencies.has(aliasId)) {
      this.error(`the module "${aliasId}" is not imported`, ast.aliasId);
    }

    const checker = this.dependencies.get(aliasId);
    if (!checker.init) {
      this.error(`the module "${aliasId}" don't has init`, ast.aliasId);
    }

    const actual = [];
    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      this.visitExpr(arg, env);
      actual.push(arg.inferred);
    }

    const expected = this.getParameterTypes(checker.init, aliasId);

    if (!eql(expected, actual)) {
      this.error(`the parameter` +
        ` types are mismatched. expected ` +
        `new ${aliasId}(${expected.map((item) => display(item)).join(', ')}), but ` +
        `new ${aliasId}(${actual.map((item) => display(item)).join(', ')})`, ast.aliasId);
    }

    for (let i = 0; i < ast.args.length; i++) {
      const arg = ast.args[i];
      arg.needCast = isNeedToMap(expected[i], arg.inferred);
      arg.expectedType = expected[i];
    }
  }

  visitArray(ast, env) {
    assert.equal(ast.type, 'array');
    for (var i = 0; i < ast.items.length; i++) {
      this.visitExpr(ast.items[i], env);
    }
  }

  getVariableType(id, env) {
    if (id.tag === Tag.VID) {
      const def = this.getInstanceProperty(id.lexeme);
      return this.getType(def.value);
    }

    const name = id.lexeme;

    if (env.local && env.local.hasDefined(name)) {
      // 返回作用域链上定义的值
      return env.local.get(name);
    }

    if (this.enums.has(name)) {
      return _enum(name);
    }

    if (this.models.has(name)) {
      return _basic('class');
    }

    if (this.dependencies.has(name)) {
      return _basic('class');
    }

    console.log(id);
    throw new Error('Can not get the type for variable');
  }

  getPropertyType(type, propName) {
    if (type.type === 'map') {
      if (type.valueType.name === 'any') {
        return _basic('any');
      }

      if (!type.valueType.name) {
        return type.valueType;
      }

      if (isBasicType(type.valueType.name)) {
        return _basic(type.valueType.name);
      }

      return _model(type.valueType.name);
    }

    if (type.type === 'model') {
      let model;
      if (type.moduleName) {
        const checker = this.dependencies.get(type.moduleName);
        model = checker.models.get(type.name);
      } else if (builtin.has(type.name)) {
        model = builtin.get(type.name);
      } else {
        model = this.models.get(type.name);
      }

      const find = findProperty(model, propName);
      if (!find) {
        return;
      }

      return this.getFieldType(find, type.name, type.moduleName);
    }
  }

  calculatePropertyType(ast, env) {
    
    if (this.enums.has(ast.id.lexeme)) {
      return _enum(ast.id.lexeme);
    }

    if (this.models.has(ast.id.lexeme)) {
      return _basic('class');
    }

  

    if (this.dependencies.has(ast.id.lexeme)) {
      const checker = this.dependencies.get(ast.id.lexeme);
      const [ mainType ] = ast.propertyPath;
      if (checker.enums.has(mainType.lexeme)) {
        return _enum(mainType.lexeme, ast.id.lexeme);
      }
      return _basic('class');
    }

    const type = this.getVariableType(ast.id, env);
    if (type.type === 'model' || type.type === 'map') {
      let current = type;
      for (let i = 0; i < ast.propertyPath.length; i++) {
        let prop = ast.propertyPath[i];
        current = this.getPropertyType(current, prop.lexeme);
      }

      return current;
    }

    console.log(ast);
    throw new Error('unknown type');
  }

  getExprType(ast, env) {
    if (!ast) {
      return _basic('void');
    }
    if (ast.inferred) {
      return ast.inferred;
    }

    if (ast.type === 'property_access' || ast.type === 'property') {
      return this.calculatePropertyType(ast, env);
    }

    if (ast.type === 'map_access') {
      let type;
      if (ast.propertyPath) {
        type = this.calculatePropertyType(ast, env);
      } else {
        type = this.getVariableType(ast.id, env);
      }

      if (type.type === 'array') {
        return type.itemType;
      } else if (type.type === 'map') {
        return type.valueType;
      }
    }

    if (ast.type === 'array_access') {
      let type;
      if (ast.propertyPath) {
        type = this.calculatePropertyType(ast, env);
      } else {
        type = this.getVariableType(ast.id, env);
      }
      
      if (type.type === 'array') {
        return type.itemType;
      }
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

    if (ast.type === 'object') {
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
        if (field.type === 'objectField') {
          let type = this.getExprType(field.expr, env);
          if (current && !isSameType(current, type)) {
            same = false;
            break;
          }
          current = type;
        } else if (field.type === 'expandField') {
          let type = this.getExprType(field.expr, env);
          if (type.type === 'map') {
            if (current && !isSameType(current, type.valueType)) {
              same = false;
              break;
            }
            current = type.valueType;
          } else {
            same = false;
            break;
          }
        }
      }

      return {
        type: 'map',
        keyType: _basic('string'),
        valueType: same ? current : _basic('any')
      };
    }

    if (ast.type === 'variable') {
      return this.getVariableType(ast.id, env);
    }

    if (ast.type === 'virtualVariable') {
      const type = this.getInstanceProperty(ast.vid.lexeme);
      return this.getType(type.value);
    }

    if (ast.type === 'null') {
      return _basic('null');
    }

    if (ast.type === 'template_string') {
      return _basic('string');
    }

    if (ast.type === 'call') {
      assert.ok(ast.inferred);
      return ast.inferred;
    }

    if (ast.type === 'super') {
      return {
        type: 'module_instance',
        name: this.parentModuleId,
        parentModuleIds: this.getParentModuleIds(this.parentModuleId),
      };
    }

    if (ast.type === 'construct') {
      return {
        type: 'module_instance',
        name: ast.aliasId.lexeme,
        parentModuleIds: this.getParentModuleIds(ast.aliasId.lexeme),
      };
    }

    if (ast.type === 'construct_model') {
      if (ast.aliasId.isModel) {
        return _model([ast.aliasId.lexeme, ...ast.propertyPath.map((item) => {
          return item.lexeme;
        })].join('.'));
      }

      return _model(ast.propertyPath.map((item) => {
        return item.lexeme;
      }).join('.'), ast.aliasId.lexeme);
    }

    if (ast.type === 'array') {
      if (ast.items.length === 0) {
        return {
          type: 'array',
          itemType: _basic('any')
        };
      }

      let current;
      let same = true;
      for (let i = 0; i < ast.items.length; i++) {
        const type = this.getExprType(ast.items[i], env);
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

    if (ast.type === 'not') {
      return _basic('boolean');
    }

    if (ast.type === 'and' || ast.type === 'or') {
      return _basic('boolean');
    }

    console.log(ast);
    throw new Error('can not get type');
  }

  getType(t, extern) {
    if (t.tag === Tag.TYPE && t.lexeme === 'object') {
      return {
        type: 'map',
        keyType: _basic('string'),
        valueType: _basic('any')
      };
    }

    if (t.tag === Tag.TYPE) {
      return _basic(t.lexeme);
    }

    if (t.tag === Tag.ID) {
      if (t.lexeme.startsWith('$')) {
        return _model(t.lexeme);
      }

      if (t.idType === 'module') {
        return {
          type: 'module_instance',
          name: t.lexeme,
          parentModuleIds: this.getParentModuleIds(t.lexeme),
        };
      }

      if (extern) {
        this.usedExternModel.get(extern).add(t.lexeme);
        if (t.idType === 'typedef') {
          return _typedef(t.lexeme, extern);
        }
        if (t.idType === 'enum') {
          return _enum(t.lexeme, extern);
        }
        return _model(t.lexeme, extern);
      }

      if (this.dependencies.has(t.lexeme)) {
        return {
          type: 'module_instance',
          name: t.lexeme,
          parentModuleIds: this.getParentModuleIds(t.lexeme),
        };
      }

      if (this.enums.has(t.lexeme)) {
        return _enum(t.lexeme);
      }

      if (this.typedefs.has(t.lexeme)) {
        return _typedef(t.lexeme);
      }

      return _model(t.lexeme);
    }

    if (t.type === 'array') {
      return {
        type: 'array',
        itemType: this.getType(t.subType)
      };
    }

    if (t.type === 'map') {
      if (t.valueType.type === 'subModel_or_moduleModel') {
        this.checkType(t.valueType);
        return {
          type: 'map',
          keyType: _type(t.keyType),
          valueType: t.valueType
        };
      }
      return {
        type: 'map',
        keyType: _type(t.keyType),
        valueType: _type(t.valueType)
      };
    }

    if (t.type === 'subModel_or_moduleModel') {
      this.checkType(t);
    }

    if (t.type === 'moduleModel') {
      const [mainId, ...rest] = t.path;
      const typeName = rest.map((item) => {
        return item.lexeme;
      }).join('.');
      this.usedExternModel.get(mainId.lexeme).add(typeName);
      return _model(typeName, mainId.lexeme);
    }

    if (t.type === 'subModel') {
      let modelName = t.path.map((tag) => {
        return tag.lexeme;
      }).join('.');
      return _model(modelName);
    }

    if (t.type === 'moduleEnum') {
      const [mainId, ...rest] = t.path;
      const typeName = rest.map((item) => {
        return item.lexeme;
      }).join('.');
      this.usedExternModel.get(mainId.lexeme).add(typeName);
      return _enum(typeName, mainId.lexeme);
    }

    if (t.type === 'moduleTypedef') {
      const [mainId, ...rest] = t.path;
      const typeName = rest.map((item) => {
        return item.lexeme;
      }).join('.');
      this.usedExternModel.get(mainId.lexeme).add(typeName);
      return _typedef(typeName, mainId.lexeme);
    }
    // return _model(t.path.map((item) => {
    //   return item.lexeme;
    // }).join('.'));

    console.log(t);
    throw new Error('un-implemented');
  }

  visitObject(ast, env) {
    assert.equal(ast.type, 'object');
    for (var i = 0; i < ast.fields.length; i++) {
      this.visitObjectField(ast.fields[i], env);
    }
    ast.inferred = this.getExprType(ast, env);
  }

  visitObjectField(ast, env) {
    if (ast.type === 'objectField') {
      this.visitExpr(ast.expr, env);
    } else if (ast.type === 'expandField') {
      this.visitExpr(ast.expr, env);
      const type = ast.expr.inferred;
      if (type.type === 'model' || type.type === 'map') {
        return;
      }

      const name = ast.expr.id.lexeme;
      this.error(`the expand field "${name}" should be an ` +
        `object or model`, ast.expr.id);
    }
  }

  visitReturnBody(ast, env) {
    assert.equal(ast.type, 'returnBody');
    this.visitStmts(ast.stmts, env);
  }

  visitStmts(ast, env) {
    assert.equal(ast.type, 'stmts');
    for (var i = 0; i < ast.stmts.length; i++) {
      const node = ast.stmts[i];
      this.visitStmt(node, env);
    }
  }

  visitReturn(ast, env) {
    assert.equal(ast.type, 'return');
    if (ast.expr) {
      this.visitExpr(ast.expr, env);
    }

    if (env.isInitMethod && ast.expr) {
      this.error(`should not have return value in init method`, ast);
    }

    // return type check
    var actual = this.getExprType(ast.expr, env);
    var expect = this.getType(env.returnType);
    ast.needCast = isNeedToModel(expect, actual);
    if (!eql([expect], [actual])) {
      this.error(`the return type is not expected, expect: ${display(expect)}, actual: ${display(actual)}`, ast);
    }
    if (ast.needCast) {
      ast.expectedType = expect;
    }
  }

  visitAssign(ast, env) {
    assert.equal(ast.type, 'assign');
    if (ast.left.type === 'virtualVariable') {
      this.checkVid(ast.left.vid, env);
    } else if (ast.left.type === 'variable') {
      this.checkId(ast.left.id, env);
    } else if (ast.left.type === 'property') {
      this.checkProperty(ast.left, env);
    } else if (ast.left.type === 'map_access') {
      let mainType;
      if (ast.left.propertyPath) {
        this.checkProperty(ast.left, env);
        mainType = this.calculatePropertyType(ast.left, env);
      } else {
        this.checkId(ast.left.id, env);
        mainType = this.getVariableType(ast.left.id, env);
      }

      if (mainType.type === 'array') {
        ast.left.type = 'array_access';
        if (!this.isNumberType(ast.left.accessKey, env)) {
          this.error(`The key expr type must be number type`, ast.accessKey);
        }
      }
    } else {
      throw new Error('unimplemented');
    }
    const expected = this.getExprType(ast.left, env);
    ast.left.inferred = expected;
    this.visitExpr(ast.expr, env);
    const actual = this.getExprType(ast.expr, env);
    if (!isAssignable(expected, actual, ast.expr)) {
      this.error(`can't assign ${display(actual)} to ${display(expected)}`, ast.expr);
    }

    if (expected.type === 'basic' && expected.name === 'readable') {
      if (actual.type === 'basic' && actual.name === 'bytes' ||
        actual.type === 'basic' && actual.name === 'string') {
        ast.expr.needToReadable = true;
      }
    }
  }

  visitDeclare(ast, env) {
    const id = ast.id.lexeme;
    // 当前作用域是否定义过
    if (env.local.has(id)) {
      this.error(`the id "${id}" was defined`, ast.id);
    }
    this.visitExpr(ast.expr, env);

    const type = this.getExprType(ast.expr, env);
    let expected;

    if (type.type === 'basic' && type.name === 'null') {
      if (!ast.expectedType) {
        this.error(`must declare type when value is null`, ast.id);
      }
      expected = this.getType(ast.expectedType);
    } else {
      if (ast.expectedType) {
        expected = this.getType(ast.expectedType);
        if (!isAssignable(expected, type, ast.expr)) {
          this.error(`declared variable with mismatched type, ` +
            `expected: ${display(expected)}, actual: ${display(type)}`, ast.id);
        }
      }
    }

    env.local.set(id, expected || type);
    ast.expr.inferred = expected || type;
  }

  visitThrow(ast, env) {
    this.visitObject(ast.expr, env);
  }

  visitIf(ast, env) {
    assert.equal(ast.type, 'if');
    this.visitExpr(ast.condition, env);
    this.visitStmts(ast.stmts, env);

    for (let i = 0; i < ast.elseIfs.length; i++) {
      const branch = ast.elseIfs[i];
      this.visitExpr(branch.condition, env);
      this.visitStmts(branch.stmts, env);
    }

    if (ast.elseStmts) {
      this.visitStmts(ast.elseStmts, env);
    }
  }

  arrayFieldFlat(arrayField){
    if (arrayField.tag === Tag.ID) {
      const typeId = arrayField.lexeme;
      const type = this.getIdType(typeId);
      if (!type) {
        this.error(`the type "${typeId}" is undefined`, arrayField);
      }
      arrayField.idType = type;
    } else if (arrayField.tag === Tag.TYPE) {
      // TODO
    } else if (arrayField.type === 'map') {
      // TODO
    } else if (arrayField.fieldType === 'array') {
      return this.arrayFieldFlat(arrayField.fieldItemType);
    } else {
      return arrayField;
    }
  }

  flatModel(root, modelBody, modelName) {
    const keys = new Map();
    for (var i = 0; i < modelBody.nodes.length; i++) {
      const node = modelBody.nodes[i];
      const fieldName = node.fieldName.lexeme;

      if (keys.has(fieldName)) {
        this.error(`redefined field "${fieldName}" in model "${modelName}"`, node.fieldName);
      }
      keys.set(fieldName, true);
      const fieldValue = node.fieldValue;

      if (fieldValue.type === 'modelBody') {
        this.flatModel(root, fieldValue, `${modelName}.${node.fieldName.lexeme}`);
      } else if (fieldValue.type === 'fieldType') {
        // check the type
        if (fieldValue.fieldType.tag === Tag.ID) {
          const typeId = fieldValue.fieldType.lexeme;
          const type = this.getIdType(typeId);
          if (!type) {
            this.error(`the type "${typeId}" is undefined`, fieldValue.fieldType);
          }

          fieldValue.fieldType.idType = type;
        }

        if (fieldValue.fieldType === 'array') {
          const modelBody = this.arrayFieldFlat(node.fieldValue.fieldItemType);
          if (modelBody) {
            const submodel = `${modelName}.${fieldName}`;
            this.flatModel(root, modelBody, submodel);
            node.fieldValue.itemType = submodel;
          }
        }

        if (fieldValue.fieldType === 'map') {
          this.checkType(fieldValue.valueType);
        }

        if (fieldValue.fieldType.type === 'subModel_or_moduleModel') {
          this.checkType(fieldValue.fieldType);
        }

        if (typeof fieldValue.fieldType === 'string') {
          this.usedTypes.set(fieldValue.fieldType, true);
        }
      } else {
        throw new Error('unimplemented');
      }
    }

    this.models.set(modelName, {
      type: 'model',
      modelName: {
        tag: Tag.ID,
        lexeme: modelName
      },
      modelBody: modelBody,
      annotation: undefined
    });
  }

  visitModel(ast) {
    assert.equal(ast.type, 'model');
    const modelName = ast.modelName.lexeme;
    this.flatModel(ast, ast.modelBody, modelName);
  }

  visitEnum(ast) {
    assert.equal(ast.type, 'enum');
    const enumName = ast.enumName.lexeme;

    const enumType = this.getType(ast.enumType);
    // only suport string & number
    if (enumType.type !== 'basic' &&
      enumType.name !== 'string' && !isNumber(enumType.name)) {
      this.error(`enum "${enumName}" has a wrong type, enum only suppot string or number.`);
    }

    for (var i = 0; i < ast.enumBody.nodes.length; i++) {
      const enumAttrs = ast.enumBody.nodes[i].enumAttrs;
      let attrNames = new Map();
      enumAttrs.forEach(attr => {
        if (attrNames.has(attr.attrName.lexeme)) {
          this.error(`the enum attribute "${attr.attrName.lexeme}" is redefined.`);
        }
        attrNames.set(attr.attrName.lexeme, true);
        if (attr.attrName.lexeme === 'value') {
          // enum's value declare just like assign
          const valueType = this.getExprType(attr.attrValue);
          if (!isAssignable(enumType, valueType)) {
            this.error(`the enum types are mismatched. expected ${enumType.name}, but ${valueType.name}`);
          } 
        }
      });
      if (!attrNames.has('value')) {
        this.error(`enum "${enumName}" must have attribute "value".`);
      }
    }
    
  }
}

function getChecker(source, filePath) {
  const lexer = new Lexer(source, filePath);
  const parser = new Parser(lexer);
  const ast = parser.program();
  return new TypeChecker(source, filePath).check(ast);
}

function analyze(source, filePath) {
  const checker = getChecker(source, filePath);
  return checker.ast;
}

exports.analyze = analyze;

exports.getChecker = getChecker;
