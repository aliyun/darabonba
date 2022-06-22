'use strict';

const { Tag, tip } = require('./tag');

const { Parser: BaseParser } = require('@jacksontian/skyline');

class Parser extends BaseParser {
  constructor(lexer) {
    super(lexer);
    this.comments = new Map();
    this.index = 0;
  }

  move() {
    do {
      this.look = this.lexer.scan();
      this.look.index = ++this.index;
      if (this.look.tag === Tag.COMMENT) {
        this.comments.set(this.look.index, this.look);
      }
    } while (this.look.tag === Tag.COMMENT);
  }

  tagTip(tag) {
    return tip(tag);
  }

  isID() {
    if (this.is(Tag.ID) ||
      this.is(Tag.NEW) ||
      this.is(Tag.EXTENDS) ||
      this.is(Tag.SUPER) ||
      this.is(Tag.TYPE) ||
      this.is(Tag.NUMBER) ||
      this.is(Tag.RPC)) {
      return true;
    }
    return false;
  }

  matchID() {
    if (this.isID()) {
      this.move();
    } else {
      this.error(`Expect ${this.tagTip(Tag.ID)}, but ${this.tokenTip(this.look)}`);
    }
  }

  getIndex() {
    return this.look.index;
  }

  program() {
    this.move();
    return this.module();
  }

  extends() {
    const begin = this.getIndex();
    this.match(Tag.EXTENDS);
    const alias = this.look;
    let end = this.getIndex();
    this.match(Tag.ID);
    if (this.is(';')) {
      end = this.getIndex();
      this.move();
    }
    alias.tokenRange = [begin, end];
    return alias;
  }

  module() {
    var annotation;
    if (this.is(Tag.ANNOTATION)) {
      annotation = this.look;
      this.move();
    }

    const imports = [];

    while (this.is(Tag.IMPORT)) {
      const begin = this.getIndex();
      this.move();
      const alias = this.look;
      let end = this.getIndex();
      this.match(Tag.ID);
      imports.push(alias);
      if (this.is(';')) {
        end = this.getIndex();
        this.move();
      }
      alias.tokenRange = [begin, end];
    }

    let extendOn;
    if (this.is(Tag.EXTENDS)) {
      extendOn = this.extends();
    }

    return {
      annotation: annotation,
      imports: imports,
      extends: extendOn,
      type: 'module',
      moduleBody: this.moduleBody(),
      comments: this.comments
    };
  }

  moduleBody() {
    // moduleBody = "{" { const | type | model | api | function } "}"
    const nodes = [];
    while (this.look.tag) {
      let node;
      let annotation;
      if (this.is(Tag.ANNOTATION)) {
        annotation = this.look;
        this.move();
      }

      if (this.is(Tag.CONST)) {
        node = this.const();
      } else if (this.isWord(Tag.ID, 'typedef')) {
        node = this.typedef();
      } else if (this.isWord(Tag.ID, 'model')) {
        node = this.model();
      } else if (this.isWord(Tag.ID, 'enum')) {
        node = this.enum();
      } else if (this.isWord(Tag.ID, 'api')) {
        node = this.api();
      } else if (this.is(Tag.RPC)) {
        node = this.rpc();
      } else if (this.isWord(Tag.ID, 'type')) {
        node = this.type();
      } else if (this.isWord(Tag.ID, 'init')) {
        node = this.init();
      } else if (this.is(Tag.STATIC) || this.isWord(Tag.ID, 'async') || this.isWord(Tag.ID, 'function')) {
        node = this.fun();
      } else {
        this.error('expect "const", "type", "model", "function", "init" or "api"');
      }

      node.annotation = annotation;
      nodes.push(node);
    }

    return {
      type: 'moduleBody',
      nodes: nodes
    };
  }

  // rpc = [ Annotation ] "rpc" rpcName "("  [ params ]  ")" returnType rpcBody
  rpc() {
    this.match(Tag.RPC);
    const rpcName = this.look;
    this.match(Tag.ID);
    this.match('(');
    const params = this.params();
    this.match(')');
    this.match(':');
    const returnType = this.baseType();
    const rpcBody = this.object();

    return {
      type: 'rpc',
      rpcName: rpcName,
      params: params,
      returnType: returnType,
      rpcBody: rpcBody,
    };
  }

  baseType() {
    if (this.look.tag === '[') {
      this.move();
      const t = this.baseType();
      this.match(']');
      return {
        type: 'array',
        subType: t
      };
    }

    if (this.isWord(Tag.TYPE, 'map')) {
      let t = this.look;
      this.move();
      this.match('[');
      const keyType = this.baseType();
      this.match(']');
      const valueType = this.baseType();
      return {
        loc: {
          start: t.loc.start,
          end: valueType.loc.end
        },
        type: 'map',
        keyType: keyType,
        valueType: valueType
      };
    }

    if (this.is(Tag.ID)) {
      var t = this.look;
      this.move();
      // for A.B
      if (this.look.tag === '.') {
        const path = [t];
        let id;
        while (this.look.tag === '.') {
          this.move();
          id = this.look;
          path.push(id);
          this.match(Tag.ID);
        }

        return {
          type: 'subModel_or_moduleModel',
          path: path,
          loc: {
            start: t.loc.start,
            end: id.loc.end
          },
        };
      }

      return t;
    }

    if (this.is(Tag.TYPE)) {
      let t = this.look;
      this.move();
      return t;
    }

    this.error(`expect base type, model id or array form`);
  }

  init() {
    const begin = this.getIndex();
    var start = this.look.loc;
    this.matchWord(Tag.ID, 'init');
    this.match('(');
    const params = this.params();
    this.match(')');

    var initBody;
    let endToken;
    if (this.is('{')) {
      initBody = this.blockStmts();
      endToken = initBody.tokenRange[1];
    } else if (this.is(';')) {
      endToken = this.getIndex();
      this.move();
    }

    var end = this.look.loc;

    return {
      type: 'init',
      loc: {
        start: start.start,
        end: end.end
      },
      params: params,
      initBody: initBody,
      tokenRange: [begin, endToken]
    };
  }

  type() {
    const begin = this.getIndex();
    this.matchWord(Tag.ID, 'type');
    const vid = this.look;
    this.match(Tag.VID);
    this.match('=');
    const value = this.baseType();
    const end = this.getIndex();
    if (this.look.tag === ';') {
      this.move();
    }

    return {
      type: 'type',
      vid: vid,
      value: value,
      tokenRange: [begin, end]
    };
  }

  typedef() {
    const begin = this.getIndex();
    this.matchWord(Tag.ID, 'typedef');
    const value = this.look;
    this.match(Tag.ID);
    const end = this.getIndex();
    if (this.look.tag === ';') {
      this.move();
    }

    return {
      type: 'typedef',
      value: value,
      tokenRange: [begin, end]
    };
  }

  const() {
    // const = "const" ID "=" constant ";"
    const begin = this.getIndex();
    this.match(Tag.CONST);
    const constName = this.look;
    this.match(Tag.ID);
    this.match('=');

    const constValue = this.look;
    if (this.look.tag === Tag.STRING ||
      this.look.tag === Tag.NUMBER ||
      this.look.tag === Tag.BOOL) {
      this.move();
    } else {
      this.error('const value must be STRING/NUMBER/BOOLEAN');
    }
    const end = this.getIndex();
    this.match(';');

    return {
      type: 'const',
      constName,
      constValue,
      tokenRange: [begin, end]
    };
  }

  model() {
    // model = "model" modelName "=" modelBody
    const begin = this.getIndex();
    this.matchWord(Tag.ID, 'model');
    const modelName = this.look;
    this.match(Tag.ID);
    // 可选的 =
    if (this.look.tag === '=') {
      this.move();
    }

    const body = this.modelBody();
    let end = body.tokenRange[1];
    if (this.is(';')) {
      // 可选的 ;
      end = this.getIndex();
      this.move();
    }

    return {
      type: 'model',
      modelName: modelName,
      modelBody: body,
      tokenRange: [begin, end]
    };
  }

  modelBody() {
    // modelBody = "{" [ modelFields ] "}"
    // modelFields = modelField { "," modelField } [","]
    const begin = this.getIndex();
    this.match('{');

    const nodes = [];

    if (this.is('}')) {
      const end = this.getIndex();
      this.move();
      return {
        type: 'modelBody',
        nodes: nodes,
        tokenRange: [begin, end]
      };
    }

    var node = this.modelField();
    nodes.push(node);

    while (!this.is('}')) {
      if (this.is(',')) {
        this.move();

        if (this.is('}')) {
          // only one fields
          break;
        }

        let node = this.modelField();
        nodes.push(node);
      } else {
        this.error('expect ","');
      }
    }

    const end = this.getIndex();
    this.match('}');

    return {
      type: 'modelBody',
      nodes: nodes,
      tokenRange: [begin, end]
    };
  }


  modelField() {
    // modelField = fieldName ["?"] ":" fieldValue [ attrs ]
    var required = true;
    let fieldName = this.look;
    const begin = this.getIndex();
    if (this.is(Tag.ID)) {
      this.move();
    } else if (
      this.isID()) {
      fieldName.tag = Tag.ID;
      this.move();
    } else {
      this.error(`only id is allowed`);
    }

    if (this.look.tag === '?') {
      required = false;
      this.move();
    }

    this.match(':');
    const fieldValue = this.fieldValue();

    const attrs = this.attrs();
    const end = this.getIndex();
    return {
      type: 'modelField',
      fieldName: fieldName,
      required: required,
      fieldValue: fieldValue,
      attrs: attrs,
      tokenRange: [begin, end]
    };
  }

  enum() {
    // enum = "enum" enumName ":" enumType enumBody
    const begin = this.getIndex();
    this.matchWord(Tag.ID, 'enum');
    const enumName = this.look;
    this.match(Tag.ID);
    this.match(':');
    const enumType = this.look;
    this.match(Tag.TYPE);
    const body = this.enumBody();
    let end = body.tokenRange[1];
    if (this.is(';')) {
      // 可选的 ;
      end = this.getIndex();
      this.move();
    }

    return {
      type: 'enum',
      enumName: enumName,
      enumType: enumType,
      enumBody: body,
      tokenRange: [begin, end]
    };
  }

  enumBody() {
    // enumBody = "{" [ enumFields ] "}"
    const begin = this.getIndex();
    this.match('{');

    const nodes = [];

    if (this.is('}')) {
      const end = this.getIndex();
      this.move();
      return {
        type: 'modelBody',
        nodes: nodes,
        tokenRange: [begin, end]
      };
    }

    var node = this.enumField();
    nodes.push(node);

    while (!this.is('}')) {
      if (this.is(',')) {
        this.move();

        if (this.is('}')) {
          // only one fields
          break;
        }

        let node = this.enumField();
        nodes.push(node);
      } else {
        this.error('expect ","');
      }
    }

    const end = this.getIndex();
    this.match('}');

    return {
      type: 'enumBody',
      nodes: nodes,
      tokenRange: [begin, end]
    };
  }


  enumField() {
    // enumField = fieldName enumAttrs
    let fieldName = this.look;
    const begin = this.getIndex();
    if (this.is(Tag.ID)) {
      this.move();
    } else if (this.is(Tag.TYPE) || this.is(Tag.NEW)) {
      fieldName.tag = Tag.ID;
      this.move();
    } else {
      this.error(`only id is allowed`);
    }
    const attrs = this.enumAttrs();
    const end = this.getIndex();
    return {
      type: 'enumField',
      fieldName: fieldName,
      enumAttrs: attrs,
      tokenRange: [begin, end]
    };
  }

  fieldValue() {
    // fieldValue = ( type | arrayType | modelBody | mapType )
    // attrs =  "(" attr { "," attr } ")"
    // attr = attrName "=" constant
    // type = "string" | "number" | "boolean"
    // mapType = "map" "[" type "]" type
    if (this.look.tag === '{') {
      return this.modelBody();
    }

    if (this.look.tag === '[') {
      const node = {
        type: 'fieldType',
        fieldType: 'array',
      };
      this.move();
      if (this.look.tag === '[') {
        node.fieldItemType = this.fieldValue();
      } else if (this.look.tag === Tag.TYPE) {
        const type = this.baseType();
        node.fieldItemType = type;
      } else if (this.look.tag === Tag.ID) {
        const id = this.look;
        node.fieldItemType = id;
        this.move();
      } else if (this.look.tag === '{') {
        node.fieldItemType = this.modelBody();
      } else {
        this.error('expect type or model name');
      }

      this.match(']');
      return node;
    }

    if (this.look.tag === Tag.TYPE) {
      const type = this.look;
      this.move();

      if (type.lexeme === 'map') {
        this.match('[');
        const keyType = this.baseType();
        this.match(']');
        const valueType = this.baseType();
        return {
          type: 'fieldType',
          fieldType: type.lexeme,
          keyType: keyType,
          valueType: valueType
        };
      }

      return {
        type: 'fieldType',
        fieldType: type.lexeme
      };
    }

    if (this.look.tag === Tag.ID) {
      const model = this.look;
      this.move();
      // for A.B
      if (this.look.tag === '.') {
        const path = [model];
        while (this.look.tag === '.') {
          this.move();
          const id = this.look;
          path.push(id);
          this.match(Tag.ID);
        }

        return {
          type: 'fieldType',
          fieldType: {
            type: 'subModel_or_moduleModel',
            path: path
          }
        };
      }

      return {
        type: 'fieldType',
        fieldType: model
      };
    }

    this.error('expect "{", "[", "string", "number", "map", ID');
  }

  attrs() {
    var attrs = [];
    if (this.look.tag !== '(') {
      return attrs;
    }
    this.match('(');

    attrs.push(this.attr());
    while (this.look.tag !== ')') {
      this.match(',');
      attrs.push(this.attr());
    }

    this.match(')');

    return attrs;
  }

  enumAttrs() {
    var attrs = [];
    this.match('(');

    attrs.push(this.enumAttr());
    while (this.look.tag !== ')') {
      this.match(',');
      attrs.push(this.enumAttr());
    }

    this.match(')');

    return attrs;
  }

  attr() {
    const attrName = this.look;
    this.match(Tag.ID);
    this.match('=');
    const attrValue = this.look;
    if (attrValue.tag === Tag.STRING ||
      attrValue.tag === Tag.NUMBER ||
      attrValue.tag === Tag.BOOL) {
      this.move();
    } else {
      this.error('expect string, number, bool');
    }

    return {
      type: 'attr',
      attrName: attrName,
      attrValue: attrValue
    };
  }

  enumAttr() {
    const attrName = this.look;
    this.match(Tag.ID);
    this.match('=');
    let attrValue;
    if (this.is(Tag.STRING)) {
      attrValue = this.string();
    } else if (this.is(Tag.NUMBER)) {
      attrValue = this.number();
    } else {
      this.error('expect string or number');
    }
    return {
      type: 'enumAttr',
      attrName: attrName,
      attrValue: attrValue
    };
  }

  api() {
    // api = "api" apiName "(" [ params ] ")" [returnType] apiBody [ returns ]
    const begin = this.getIndex();
    this.matchWord(Tag.ID, 'api');
    const apiName = this.look;
    this.match(Tag.ID);
    this.match('(');
    const params = this.params();
    this.match(')');
    this.match(':');
    const returnType = this.baseType();
    const apiBody = this.apiBody();
    let end = apiBody.tokenRange[1];
    var returnBody;
    if (this.isWord(Tag.ID, 'returns')) {
      // 可选的
      this.move();
      returnBody = this.returnBody();
      end = returnBody.tokenRange[1];
    }

    var runtimeBody;
    if (this.isWord(Tag.ID, 'runtime')) {
      this.move();
      runtimeBody = this.object();
      end = runtimeBody.tokenRange[1];
    }

    return {
      type: 'api',
      apiName: apiName,
      params: params,
      returnType: returnType,
      apiBody: apiBody,
      returns: returnBody,
      runtimeBody: runtimeBody,
      tokenRange: [begin, end]
    };
  }

  params() {
    if (this.look.tag === ')') {
      return {
        type: 'params',
        params: []
      };
    }

    var params = [];
    var param = this.param();
    params.push(param);

    while (this.look.tag !== ')') {
      this.match(',');
      params.push(this.param());
    }

    return {
      type: 'params',
      params: params
    };
  }

  param() {
    const paramName = this.look;
    this.match(Tag.ID);
    this.match(':');
    const paramType = this.baseType();

    var defaultValue = null;
    if (this.look.tag === '=') {
      this.move();
      defaultValue = this.look;
      this.match(Tag.STRING);
    }

    return {
      type: 'param',
      paramName: paramName,
      paramType: paramType,
      defaultValue: defaultValue
    };
  }

  apiBody() {
    var stmts = this.blockStmts();
    return {
      type: 'apiBody',
      stmts: stmts,
      tokenRange: [
        stmts.tokenRange[0],
        stmts.tokenRange[1]
      ]
    };
  }

  array() {
    // array = "[" [ arrayItems ] "]"
    // arrayItems = expr { "," expr }
    const begin = this.getIndex();
    this.match('[');
    var items = [];
    if (this.look.tag === ']') {
      const end = this.getIndex();
      this.move();
      return {
        type: 'array',
        items: items,
        tokenRange: [begin, end]
      };
    }

    var item = this.expr();
    items.push(item);

    while (this.look.tag !== ']') {
      if (this.look.tag === ',') {
        this.move();
        let item = this.expr();
        items.push(item);
      } else {
        this.error('expect ","');
      }
    }
    const end = this.getIndex();
    this.match(']');

    return {
      type: 'array',
      items: items,
      tokenRange: [begin, end]
    };
  }

  object() {
    // object = "{" [ objectFields ] "}"
    // objectFields = objectField { "," objectField } [","]
    const begin = this.getIndex();
    var start = this.lexer.loc();
    this.match('{');

    var fields = [];
    if (this.look.tag === '}') {
      const end = this.getIndex();
      this.move();
      return {
        type: 'object',
        fields: fields,
        loc: {
          start: start,
          end: this.lexer.loc()
        },
        tokenRange: [begin, end]
      };
    }

    var field = this.objectField();
    fields.push(field);

    while (this.look.tag !== '}') {
      if (this.look.tag === ',') {
        this.move();

        if (this.look.tag === '}') {
          // only one fields
          break;
        }
        let field = this.objectField();
        fields.push(field);
      } else {
        this.error('expect ","');
      }
    }
    const end = this.getIndex();
    this.match('}');

    return {
      type: 'object',
      fields: fields,
      loc: {
        start: start,
        end: this.lexer.loc()
      },
      tokenRange: [begin, end]
    };
  }

  objectField() {
    // objectField = objectFieldName "=" expr
    const begin = this.getIndex();
    if (this.isID()) {
      var fieldName = this.look;
      this.move();
      this.match('=');
      var expr = this.expr();
      const end = this.getIndex();
      return {
        type: 'objectField',
        fieldName: fieldName,
        expr: expr,
        tokenRange: [begin, end]
      };
    }

    if (this.look.tag === '.') {
      this.move();
      this.match('.');
      this.match('.');
      let expr = this.expr();
      const end = this.getIndex();
      return {
        type: 'expandField',
        expr: expr,
        tokenRange: [begin, end]
      };
    }

    this.error('expect "..." or ID');
  }

  args() {
    const args = [];

    if (this.look.tag === ')') {
      return args;
    }

    var arg = this.expr();
    args.push(arg);
    while (this.look.tag !== ')') {
      this.match(',');
      args.push(this.expr());
    }

    return args;
  }

  string() {
    var str = this.look;
    this.match(Tag.STRING);
    return {
      type: 'string',
      value: str,
      loc: str.loc
    };
  }

  number() {
    var str = this.look;
    this.match(Tag.NUMBER);
    return {
      type: 'number',
      value: str,
      loc: str.loc
    };
  }

  bool() {
    var v = this.look;
    this.match(Tag.BOOL);
    return {
      type: 'boolean',
      value: v.lexeme === 'true',
      loc: v.loc
    };
  }

  template() {
    var elements = [];
    elements.push({
      type: 'element',
      value: this.look
    });

    var last = this.look;
    this.move();
    if (last.tag === Tag.TEMPLATE && last.tail === true) {
      return {
        type: 'template_string',
        elements: elements
      };
    }

    for (; ;) {
      if (this.look.tag === Tag.TEMPLATE) {
        var current = this.look;
        elements.push({
          type: 'element',
          value: this.look
        });
        this.move();
        if (current.tail === true) {
          break;
        }
      } else {
        var expr = this.expr();
        elements.push({
          type: 'expr',
          expr: expr
        });
      }
    }

    return {
      type: 'template_string',
      elements: elements
    };
  }

  construct() {
    this.move();
    const id = this.look;
    this.match(Tag.ID);

    if (this.look.tag === '(') {
      this.move();
      const args = this.args();
      this.match(')');

      return {
        type: 'construct',
        aliasId: id,
        args: args
      };
    }

    const propertyPath = [];
    while (this.look.tag === '.') {
      this.move();
      const id = this.look;
      propertyPath.push(id);
      this.match(Tag.ID);
    }

    let object = null;
    if (this.look.tag === '{') {
      object = this.object();
    }

    return {
      type: 'construct_model',
      aliasId: id,
      propertyPath,
      object: object
    };
  }

  idThings() {
    var id = this.look;
    this.matchID();

    // id = xxx
    if (this.look.tag === '=') {
      this.move();
      let expr = this.expr();
      return {
        type: 'assign',
        left: {
          type: 'variable',
          id: id,
        },
        expr
      };
    }

    // id()
    if (this.look.tag === '(') {
      this.move();
      const args = this.args();
      this.match(')');
      return {
        type: 'call',
        left: {
          type: 'method_call',
          id: id
        },
        args,
        loc: {
          start: id.loc.start,
          end: this.lexer.loc()
        }
      };
    }

    if (this.look.tag === '[') {
      this.move();
      let accessKey = this.expr();
      this.match(']');
      // @id.x[]
      return this.mapAccess({
        type: 'map_access',
        id: id,
        accessKey: accessKey,
        loc: {
          start: id.loc.start,
          end: this.lexer.loc()
        }
      });
    }

    // id.x = xxx, id.x(), id.x
    if (this.look.tag === '.') {
      const propertyPath = [];
      while (this.look.tag === '.') {
        this.move();
        var prop = this.look;
        this.matchID();
        propertyPath.push(prop);
      }

      // id.x()
      if (this.look.tag === '(') {
        this.move();
        const args = this.args();
        this.match(')');
        // Module.staticCall() or module.instanceCall()
        return {
          type: 'call',
          left: {
            type: 'static_or_instance_call',
            id: id,
            propertyPath: propertyPath
          },
          args: args,
          loc: {
            start: id.loc.start,
            end: this.lexer.loc()
          },
        };
      }

      if (this.look.tag === '[') {
        this.move();
        let accessKey = this.expr();
        this.match(']');
        // @id.x[]
        return this.mapAccess({
          type: 'map_access',
          id: id,
          propertyPath: propertyPath,
          accessKey: accessKey,
          loc: {
            start: id.loc.start,
            end: this.lexer.loc()
          }
        });
      }

      // id.x = xxx
      if (this.look.tag === '=') {
        this.move();
        let expr = this.expr();
        return {
          type: 'assign',
          left: {
            type: 'property',
            id,
            propertyPath
          },
          expr: expr
        };
      }

      // id.x
      return {
        type: 'property_access',
        id: id,
        propertyPath: propertyPath,
        loc: {
          start: id.loc.start,
          end: this.lexer.loc()
        }
      };
    }

    return {
      type: 'variable',
      id: id,
      loc: id.loc
    };
  }

  mapAccess(mapAccessAst) {
    if (this.look.tag === '=') {
      this.move();
      let expr = this.expr();
      return {
        type: 'assign',
        left: mapAccessAst,
        expr: expr
      };
    }
    return mapAccessAst;
  }

  vidThings() {
    var vid = this.look;
    this.match(Tag.VID);

    // @id = xxx
    if (this.look.tag === '=') {
      this.move();
      var expr = this.expr();
      return {
        type: 'assign',
        left: {
          type: 'virtualVariable',
          vid: vid
        },
        expr: expr,
        loc: {
          start: vid.loc.start,
          end: this.lexer.loc()
        }
      };
    }

    // @vid.x = xxx, @id.x(), @id.x
    if (this.look.tag === '.') {
      const propertyPath = [];
      while (this.look.tag === '.') {
        this.move();
        var prop = this.look;
        this.match(Tag.ID);
        propertyPath.push(prop);
      }

      // id.x()
      if (this.look.tag === '(') {
        this.move();
        const args = this.args();
        this.match(')');
        // Module.staticCall() or module.instanceCall()
        return {
          type: 'call',
          left: {
            type: 'static_or_instance_call',
            id: vid,
            propertyPath: propertyPath
          },
          args: args,
          loc: {
            start: vid.loc.start,
            end: this.lexer.loc()
          },
        };
      }

      // id.x = xxx
      if (this.look.tag === '=') {
        this.move();
        let expr = this.expr();
        return {
          type: 'assign',
          left: {
            type: 'property',
            id: vid,
            propertyPath
          },
          expr: expr
        };
      }

      if (this.look.tag === '[') {
        this.move();
        let accessKey = this.expr();
        this.match(']');
        // @id.x[]
        return this.mapAccess({
          type: 'map_access',
          id: vid,
          propertyPath: propertyPath,
          accessKey: accessKey,
          loc: {
            start: vid.loc.start,
            end: this.lexer.loc()
          }
        });
      }

      // id.x
      return {
        type: 'property_access',
        id: vid,
        propertyPath: propertyPath,
        loc: {
          start: vid.loc.start,
          end: this.lexer.loc()
        }
      };
    }


    if (this.look.tag === '[') {
      this.move();
      let accessKey = this.expr();
      this.match(']');
      // @id.x[]
      return this.mapAccess({
        type: 'map_access',
        id: vid,
        accessKey: accessKey,
        loc: {
          start: vid.loc.start,
          end: this.lexer.loc()
        }
      });
    }

    return {
      type: 'virtualVariable',
      vid: vid,
      loc: vid.loc
    };
  }

  exprItem() {
    if (this.look.tag === '!') {
      return this.notExpr();
    }

    if (this.look.tag === Tag.STRING) {
      return this.string();
    }

    if (this.look.tag === Tag.NUMBER) {
      return this.number();
    }

    if (this.look.tag === Tag.BOOL) {
      return this.bool();
    }

    if (this.look.tag === Tag.NULL) {
      this.move();
      return {
        type: 'null'
      };
    }

    if (this.look.tag === Tag.NEW) {
      return this.construct();
    }

    if (this.look.tag === Tag.ID) {
      return this.idThings();
    }

    if (this.look.tag === Tag.VID) {
      return this.vidThings();
    }

    if (this.look.tag === '{') {
      return this.object();
    }

    if (this.look.tag === '[') {
      return this.array();
    }

    if (this.look.tag === Tag.TEMPLATE) {
      return this.template();
    }

    if (this.look.tag === Tag.SUPER) {
      return this.superCall();
    }

    this.error('expect valid expression');
  }

  superCall() {
    var start = this.lexer.loc();
    this.match(Tag.SUPER);
    this.match('(');
    const args = this.args();
    this.match(')');
    return {
      type: 'super',
      args: args,
      loc: {
        start: start,
        end: this.look.loc.end
      }
    };
  }

  notExpr() {
    var start = this.lexer.loc();
    this.match('!');
    const expr = this.exprItem();
    return {
      type: 'not',
      expr: expr,
      loc: {
        start: start,
        end: this.look.loc.end
      }
    };
  }

  expr() {
    const begin = this.getIndex();
    const item = this.exprItem();
    let end = this.getIndex();
    if (this.is(Tag.AND)) {
      this.move();
      const right = this.expr();
      return {
        type: 'and',
        left: item,
        right: right,
        loc: {
          start: item.loc.start,
          end: this.look.loc.end
        },
        tokenRange: [begin, right.tokenRange[1]]
      };
    }

    if (this.is(Tag.OR)) {
      this.move();
      const right = this.expr();
      return {
        type: 'or',
        left: item,
        right: right,
        loc: {
          start: item.loc.start,
          end: this.look.loc.end
        },
        tokenRange: [begin, right.tokenRange[1]]
      };
    }
    item.tokenRange = [begin, end];
    return item;
  }

  returnBody() {
    var start = this.lexer.loc();
    const stmts = this.blockStmts();
    return {
      type: 'returnBody',
      loc: {
        start: start,
        end: this.lexer.loc()
      },
      stmts: stmts,
      tokenRange: [stmts.tokenRange[0], stmts.tokenRange[1]]
    };
  }

  stmts() {
    if (this.look.tag === '}') {
      return {
        type: 'stmts',
        stmts: []
      };
    }

    const stmts = [];
    var stmt = this.stmt();
    stmts.push(stmt);
    while (this.look.tag !== '}') {
      let stmt = this.stmt();
      stmts.push(stmt);
    }
    return {
      type: 'stmts',
      stmts: stmts
    };
  }

  blockStmts() {
    const begin = this.getIndex();
    this.match('{');
    var stmts = this.stmts();
    const end = this.getIndex();
    this.match('}');
    stmts.tokenRange = [begin, end];
    return stmts;
  }

  ifStmt() {
    const begin = this.getIndex();
    this.match(Tag.IF);
    this.match('(');
    var condition = this.expr();
    this.match(')');
    var stmts = this.blockStmts();
    var end = stmts.tokenRange[1];

    var elseStmts;
    var elseIfs = [];
    while (this.look.tag === Tag.ELSE) {
      this.move();
      if (this.look.tag === Tag.IF) {
        this.move();
        this.match('(');
        let condition = this.expr();
        this.match(')');
        let stmts = this.blockStmts();
        end = stmts.tokenRange[1];
        elseIfs.push({
          type: 'elseif',
          condition: condition,
          stmts: stmts
        });
      } else if (this.look.tag === '{') {
        elseStmts = this.blockStmts();
        end = elseStmts.tokenRange[1];
        break;
      } else {
        this.error('expect "if" or "{"');
      }
    }

    return {
      type: 'if',
      condition: condition,
      stmts: stmts,
      elseIfs: elseIfs,
      elseStmts: elseStmts,
      tokenRange: [begin, end]
    };
  }

  throwStmt() {
    const begin = this.getIndex();
    this.match(Tag.THROW);
    let expr = this.object();
    let end = expr.tokenRange[1];
    if (this.look.tag === ';') {
      end = this.getIndex();
      this.move();
    }
    return {
      type: 'throw',
      expr: expr,
      tokenRange: [begin, end]
    };
  }

  tryStmt() {
    const begin = this.getIndex();
    this.match(Tag.TRY);
    let tryStmts = this.blockStmts();
    let catchStmts = null;
    let id = null;
    let finallyStmts = null;
    let end;
    if (this.look.tag === Tag.CATCH || this.look.tag === Tag.FINALLY) {
      if (this.look.tag === Tag.CATCH) {
        this.move();
        this.match('(');
        id = this.look;
        this.match(Tag.ID);
        this.match(')');
        catchStmts = this.blockStmts();
        end = catchStmts.tokenRange[1];
      }
      if (this.look.tag === Tag.FINALLY) {
        this.move();
        finallyStmts = this.blockStmts();
        end = finallyStmts.tokenRange[1];
      }
    } else {
      this.error('"try" expect "catch" or "finally"');
    }

    return {
      type: 'try',
      tryBlock: tryStmts,
      catchId: id,
      catchBlock: catchStmts,
      finallyBlock: finallyStmts,
      tokenRange: [begin, end]
    };
  }

  whileStmt() {
    const begin = this.getIndex();
    this.match(Tag.WHILE);
    this.match('(');
    const expr = this.expr();
    this.match(')');
    const stmts = this.blockStmts();
    const end = stmts.tokenRange[1];
    return {
      type: 'while',
      condition: expr,
      stmts: stmts,
      tokenRange: [begin, end]
    };
  }

  forStmt() {
    const begin = this.getIndex();
    this.match(Tag.FOR);
    this.match('(');
    this.match(Tag.VAR);
    var id = this.look;
    this.match(Tag.ID);
    this.match(':');
    const expr = this.expr();
    this.match(')');
    const stmts = this.blockStmts();
    const end = stmts.tokenRange[1];
    return {
      type: 'for',
      id: id,
      list: expr,
      stmts: stmts,
      tokenRange: [begin, end]
    };
  }

  breakStmt() {
    const begin = this.getIndex();
    this.match(Tag.BREAK);
    const end = this.getIndex();
    this.match(';');

    return {
      type: 'break',
      tokenRange: [begin, end]
    };
  }

  retryStmt() {
    const token = this.look;
    const begin = this.getIndex();
    this.matchWord(Tag.ID, 'retry');
    const end = this.getIndex();
    this.match(';');
    return {
      type: 'retry',
      loc: token.loc,
      tokenRange: [begin, end]
    };
  }

  stmt() {
    if (this.look.tag === Tag.IF) {
      return this.ifStmt();
    }

    if (this.look.tag === Tag.WHILE) {
      return this.whileStmt();
    }

    if (this.look.tag === Tag.FOR) {
      return this.forStmt();
    }

    if (this.look.tag === Tag.TRY) {
      return this.tryStmt();
    }

    if (this.isWord(Tag.ID, 'retry')) {
      return this.retryStmt();
    }

    if (this.look.tag === Tag.BREAK) {
      return this.breakStmt();
    }

    if (this.look.tag === Tag.RETURN) {
      return this.returnStmt();
    }

    if (this.look.tag === Tag.THROW) {
      return this.throwStmt();
    }

    if (this.look.tag === Tag.VAR) {
      return this.declare();
    }

    let expr = this.expr();
    this.match(';');
    return expr;
  }

  returnStmt() {
    const begin = this.getIndex();
    var returnToken = this.look;
    this.move();
    let end = this.getIndex();
    if (this.is(';')) {
      this.move();
      return {
        type: 'return',
        loc: {
          start: returnToken.loc.start,
          end: this.look.loc.end
        },
        tokenRange: [begin, end]
      };
    }

    let expr = this.expr();
    end = this.getIndex();
    this.match(';');
    return {
      type: 'return',
      expr: expr,
      loc: {
        start: returnToken.loc.start,
        end: this.look.loc.end
      },
      tokenRange: [begin, end]
    };
  }

  declare() {
    const begin = this.getIndex();
    this.match(Tag.VAR);
    let id = this.look;
    this.matchID();
    let expectedType;
    if (this.look.tag === ':') {
      this.move();
      expectedType = this.baseType();
    }
    this.match('=');
    let expr = this.expr();
    const end = this.getIndex();
    this.match(';');
    return {
      type: 'declare',
      id: id,
      expr: expr,
      expectedType,
      tokenRange: [begin, end]
    };
  }

  fun() {
    // function = [ Annotation ] ["static"] "funtion" apiName "("  [ params ]  ")" returnType functionBody
    const begin = this.getIndex();
    let isStatic = false;
    let hasThrow = false;
    if (this.is(Tag.STATIC)) {
      isStatic = true;
      this.move();
    }

    let isAsync = false;
    if (this.isWord(Tag.ID, 'async')) {
      isAsync = true;
      this.move();
    }

    this.matchWord(Tag.ID, 'function');
    const functionName = this.look;
    this.match(Tag.ID);
    this.match('(');
    const params = this.params();
    this.match(')');
    if (this.isWord(Tag.ID, 'throws')) {
      hasThrow = true;
      this.move();
    }
    this.match(':');
    const returnType = this.baseType();
    let functionBody = null;
    let end = this.getIndex();
    if (this.look.tag === '{') {
      functionBody = this.functionBody();
      end = functionBody.tokenRange[1];
    } else if (this.look.tag === ';') {
      this.move();
    }

    return {
      type: 'function',
      isStatic: isStatic,
      isAsync: isAsync,
      hasThrow: hasThrow,
      functionName: functionName,
      params: params,
      returnType: returnType,
      functionBody: functionBody,
      tokenRange: [begin, end]
    };
  }

  functionBody() {
    var start = this.lexer.loc();
    const stmts = this.blockStmts();
    return {
      type: 'functionBody',
      loc: {
        start: start,
        end: this.lexer.loc()
      },
      stmts: stmts,
      tokenRange: [stmts.tokenRange[0], stmts.tokenRange[1]]
    };
  }
}

module.exports = Parser;
