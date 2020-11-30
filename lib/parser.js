'use strict';

const { Tag } = require('./tag');

class Parser extends require('./base_parser') {
  constructor(lexer) {
    super(lexer);
  }

  program() {
    this.move();
    var annotation;
    if (this.is(Tag.ANNOTATION)) {
      annotation = this.look;
      this.move();
    }

    const imports = this.imports();

    if (this.is(Tag.MODULE)) {
      const begin = this.getIndex();
      // module "module" ID ";"
      this.move();
      const moduleName = this.look;
      this.match(Tag.ID);

      let extendFrom;
      if (this.is(Tag.EXTENDS)) {
        this.move();
        extendFrom = this.component();
      }

      let implements_ = [];
      if (this.is(Tag.IMPLEMENTS)) {
        this.move();
        implements_.push(this.component());

        while (this.look.tag === ',') {
          this.move();
          implements_.push(this.component());
        }
      }

      const body = this.moduleBody();
      const end = this.getIndex();
      this.match(undefined);
      return {
        annotation: annotation,
        imports: imports,
        extends: extendFrom,
        implements: implements_,
        name: moduleName,
        type: 'module',
        moduleBody: body,
        tokenRange: [begin, end],
        comments: this.lexer.comments
      };
    }

    if (this.is(Tag.INTERFACE)) {
      const begin = this.getIndex();
      // interface = "interface" ID ";"
      this.move();
      const interfaceName = this.look;
      this.match(Tag.ID);
      const interfaceBody = this.interfaceBody();
      const end = this.getIndex();
      this.match(undefined);
      return {
        annotation: annotation,
        imports: imports,
        name: interfaceName,
        type: 'interface',
        interfaceBody: interfaceBody,
        tokenRange: [begin, end],
        comments: this.lexer.comments
      };
    }

    if (this.is(Tag.MODEL)) {
      const begin = this.getIndex();
      this.move();
      const modelName = this.look;
      this.match(Tag.ID);
      const modelBody = this.modelBody();
      const end = this.getIndex();
      this.match(undefined);

      return {
        annotation: annotation,
        imports: imports,
        name: modelName,
        type: 'model',
        modelBody: modelBody,
        tokenRange: [begin, end],
        comments: this.lexer.comments
      };
    }

    if (this.isWord(Tag.ID, 'main')) {
      const begin = this.getIndex();
      this.move();
      const mainBody = this.mainBody();
      const end = this.getIndex();
      this.match(undefined);

      return {
        annotation: annotation,
        imports: imports,
        type: 'main',
        mainBody: mainBody,
        tokenRange: [begin, end],
        comments: this.lexer.comments
      };
    }

    this.error(`expect 'module', 'model', 'interface' or 'main'`);
  }

  interfaceBody() {
    // interfaceBody = "{" { function } "}"
    const begin = this.getIndex();
    this.match('{');
    const nodes = [];
    while (!this.is('}')) {
      let node;
      let annotation;
      if (this.is(Tag.ANNOTATION)) {
        annotation = this.look;
        this.move();
      }

      if (this.isWord(Tag.ID, 'async') || this.isWord(Tag.ID, 'function')) {
        node = this.interfaceFun();
      } else {
        this.error('expect "function"');
      }

      node.annotation = annotation;
      nodes.push(node);
    }

    const end = this.getIndex();
    this.match('}');

    return {
      type: 'interfaceBody',
      nodes: nodes,
      tokenRange: [begin, end]
    };
  }

  mainBody() {
    // mainBody = "{" { main | function } "}"
    const begin = this.getIndex();
    this.match('{');
    const nodes = [];
    while (!this.is('}')) {
      let node;
      let annotation;
      if (this.is(Tag.ANNOTATION)) {
        annotation = this.look;
        this.move();
      }

      if (this.isWord(Tag.ID, 'main')) {
        node = this.main();
      } else if (this.is(Tag.STATIC) || this.isWord(Tag.ID, 'async') || this.isWord(Tag.ID, 'function')) {
        node = this.fun();
      } else {
        this.error('expect "main" or "function"');
      }

      node.annotation = annotation;
      nodes.push(node);
    }

    const end = this.getIndex();
    this.match('}');

    return {
      type: 'mainBody',
      nodes: nodes,
      tokenRange: [begin, end]
    };
  }

  main() {
    // function = [ Annotation ] "main" "("  [ params ]  ")" functionBody
    const begin = this.getIndex();
    const main = this.look;
    this.matchWord(Tag.ID, 'main');
    this.match('(');
    const params = this.params();
    this.match(')');
    let functionBody = this.functionBody();
    const end = this.getIndex();
    return {
      type: 'main',
      main: main,
      params: params,
      functionBody: functionBody,
      tokenRange: [begin, end]
    };
  }

  moduleBody() {
    const begin = this.getIndex();
    this.match('{');

    // moduleBody = "{" { type | function | init } "}"
    const nodes = [];
    while (!this.is('}')) {
      let node;
      let annotation;
      if (this.is(Tag.ANNOTATION)) {
        annotation = this.look;
        this.move();
      }

      if (this.isWord(Tag.ID, 'type')) {
        node = this.type();
      } else if (this.isWord(Tag.ID, 'init')) {
        node = this.init();
      } else if (this.is(Tag.STATIC) || this.isWord(Tag.ID, 'async') || this.isWord(Tag.ID, 'function')) {
        node = this.fun();
      } else {
        this.error('expect "const", "type", "function" or "init"');
      }

      node.annotation = annotation;
      nodes.push(node);
    }

    const end = this.getIndex();
    this.match('}');
    return {
      type: 'moduleBody',
      nodes: nodes,
      tokenRange: [begin, end]
    };
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
    } else if (this.is(Tag.TYPE)) {
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
    const fieldType = this.baseType();

    const attrs = this.attrs();
    const end = this.getIndex();
    return {
      type: 'modelField',
      fieldName: fieldName,
      required: required,
      fieldType: fieldType,
      attrs: attrs,
      tokenRange: [begin, end]
    };
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

  modelLitBody() {
    // modelBody = "{" [ modelFields ] "}"
    // modelFields = modelField { "," modelField } [","]
    const begin = this.getIndex();
    var start = this.lexer.loc();
    this.match('{');

    var fields = [];
    if (this.look.tag === '}') {
      const end = this.getIndex();
      this.move();
      return {
        type: 'fields',
        fields: fields,
        loc: {
          start: start,
          end: this.lexer.loc()
        },
        tokenRange: [begin, end]
      };
    }
    
    var field = this.modelLitField();
    fields.push(field);

    while (this.look.tag !== '}') {
      if (this.look.tag === ',') {
        this.move();
    
        if (this.look.tag === '}') {
          // only one fields
          break;
        }
        let field = this.modelLitField();
        fields.push(field);
      } else {
        this.error('expect ","');
      }
    }
    const end = this.getIndex();
    this.match('}');
    
    return {
      type: 'fields',
      fields: fields,
      loc: {
        start: start,
        end: this.lexer.loc()
      },
      tokenRange: [begin, end]
    };
  }

  modelLitField() {
    // modelField = key "=" expr
    const begin = this.getIndex();
    var fieldName = this.look;
    this.match(Tag.ID);
    this.match('=');
    var expr = this.expr();
    const end = this.getIndex();
    return {
      type: 'modelField',
      key: fieldName,
      expr: expr,
      tokenRange: [begin, end]
    };
  }

  map() {
    // map = "{" [ mapFields ] "}"
    // mapFields = mapField { "," mapField } [","]
    const begin = this.getIndex();
    var start = this.lexer.loc();
    this.match('{');
    
    var fields = [];
    if (this.look.tag === '}') {
      const end = this.getIndex();
      this.move();
      return {
        type: 'map',
        fields: fields,
        loc: {
          start: start,
          end: this.lexer.loc()
        },
        tokenRange: [begin, end]
      };
    }
    
    var field = this.mapField();
    fields.push(field);
    
    while (this.look.tag !== '}') {
      if (this.look.tag === ',') {
        this.move();
    
        if (this.look.tag === '}') {
          // only one fields
          break;
        }
        let field = this.mapField();
        fields.push(field);
      } else {
        this.error('expect ","');
      }
    }
    const end = this.getIndex();
    this.match('}');
    
    return {
      type: 'map',
      fields: fields,
      loc: {
        start: start,
        end: this.lexer.loc()
      },
      tokenRange: [begin, end]
    };
  }

  mapField() {
    // mapField = mapKey "=" expr
    const begin = this.getIndex();
    if (this.look.tag === Tag.STRING) {
      var mapKey = this.look;
      this.move();
      this.match('=');
      var expr = this.expr();
      const end = this.getIndex();
      return {
        type: 'mapField',
        key: mapKey,
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
    
    this.error('expect "..." or key');
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
    const new_ = this.look;
    this.move();
    let component = this.component();

    if (this.look.tag === '(') {
      this.move();
      const args = this.args();
      this.match(')');
      return {
        type: 'construct_module',
        component: component,
        args: args,
        loc: {
          start: new_.loc.start,
          end: this.lexer.loc()
        }
      };
    }

    const fields = this.modelLitBody();

    return {
      type: 'construct_model',
      component: component,
      fields: fields,
      loc: {
        start: new_.loc.start,
        end: this.lexer.loc()
      }
    };
  }

  idThings() {
    var id = this.look;
    let left = {
      type: 'id',
      id: id,
      loc: id.loc
    };

    this.move();
    for ( ; ; ) {
      if (this.look.tag === '.') {
        this.move();
        const id = this.look;
        this.match(Tag.ID);
        left = {
          type: 'property',
          object: left,
          property: id,
          loc: {
            start: left.loc.start,
            end: this.lexer.loc()
          }
        };
      } else if (this.look.tag === '[') {
        this.move();
        const expr = this.exprItem();
        this.match(']');
        left = {
          type: 'member',
          object: left,
          index: expr,
          loc: {
            start: left.loc.start,
            end: this.lexer.loc()
          }
        };
      } else {
        break;
      }
    }

    // id.x()
    if (this.look.tag === '(') {
      this.move();
      const args = this.args();
      this.match(')');
    
      return {
        type: 'call',
        callee: left,
        args: args,
        loc: {
          start: id.loc.start,
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
        left: left,
        expr: expr
      };
    }
    
    return left;
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

    if (this.look.tag === Tag.VAR) {
      return this.declareExpr();
    }

    if (this.look.tag === Tag.ID || this.look.tag === Tag.VID || this.is(Tag.PACK_ID)) {
      return this.idThings();
    }

    if (this.look.tag === '{') {
      return this.map();
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

    if (this.look.tag === Tag.INLINE_ID) {
      return this.inlineCall();
    }

    if (this.is(';') || this.is(')')) {
      return {
        type: 'empty',
        loc: {
          start: this.lexer.loc(),
          end: this.lexer.loc()
        }
      };
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

  inlineCall() {
    var start = this.lexer.loc();
    const name = this.look;
    this.match(Tag.INLINE_ID);
    this.match('(');
    const args = this.args();
    this.match(')');
    return {
      type: 'inline',
      name: name,
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
    if (this.is(Tag.OPERATOR)) {
      const op = this.look;
      this.move();
      const right = this.expr();
      return {
        type: 'binary',
        operator: op.lexeme,
        left: item,
        right: right,
        loc: {
          start: item.loc.start,
          end: this.look.loc.end
        },
        tokenRange: [begin, right.tokenRange[1]]
      };
    }

    if (this.is(Tag.LOGICAL)) {
      const op = this.look;
      this.move();
      const right = this.expr();
      return {
        type: 'logical',
        operator: op.lexeme,
        left: item,
        right: right,
        loc: {
          start: item.loc.start,
          end: this.look.loc.end
        },
        tokenRange: [begin, right.tokenRange[1]]
      };
    }

    if (this.is(Tag.TO)) {
      this.move();
      let model = this.component();
      const index = this.getIndex();

      return {
        type: 'to',
        from: item,
        to: model,
        loc: {
          start: item.loc.start,
          end: this.look.loc.end
        },
        tokenRange: [begin, index]
      };
    }

    item.tokenRange = [begin, end];
    return item;
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
    const branches = [];
    this.match(Tag.IF);
    this.match('(');
    const condition = this.expr();
    this.match(')');
    branches.push({
      type: 'if_branch',
      condition: condition,
      stmts: this.blockStmts()
    });
    
    while (this.look.tag === Tag.ELSE) {
      this.move();
      if (this.look.tag === Tag.IF) {
        this.move();
        this.match('(');
        let condition = this.expr();
        this.match(')');
        branches.push({
          type: 'if_branch',
          condition: condition,
          stmts: this.blockStmts()
        });
      } else if (this.look.tag === '{') {
        branches.push({
          type: 'else_branch',
          stmts: this.blockStmts()
        });
        break;
      } else {
        this.error('expect "if" or "{"');
      }
    }
    
    let end = branches[branches.length - 1].stmts.tokenRange[1];
    
    return {
      type: 'if',
      branches: branches,
      tokenRange: [begin, end]
    };
  }
    
  throwStmt() {
    const begin = this.getIndex();
    this.match(Tag.THROW);
    let expr = this.map();
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
    const expr = this.expr();
    if (this.is(';')) {
      this.move();
      const test = this.expr();
      this.match(';');
      const update = this.expr();
      this.match(')');
      const stmts = this.blockStmts();
      const end = stmts.tokenRange[1];
      return {
        type: 'for',
        init: expr,
        test: test,
        update: update,
        stmts: stmts,
        tokenRange: [begin, end]
      };
    }

    if (expr.type !== 'declare_expr') {
      this.error(`must be declare expression`);
    }

    this.match(Tag.OF);
    const right = this.expr();
    this.match(')');
    const stmts = this.blockStmts();
    const end = stmts.tokenRange[1];
    return {
      type: 'for_of',
      left: expr,
      right: right,
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
      return this.declareStmt();
    }

    let expr = this.expr();
    this.match(';');
    return expr;
  }

  returnStmt() {
    const begin = this.getIndex();
    const start = this.look.loc;
    this.match(Tag.RETURN);
    const expr = this.expr();
    const end = this.look.loc;
    this.match(';');
    return {
      type: 'return',
      expr: expr,
      loc: {
        start: start.start,
        end: end.end
      },
      tokenRange: [begin, this.getIndex()]
    };
  }

  declareStmt() {
    const begin = this.getIndex();
    this.match(Tag.VAR);
    const id = this.look;
    this.match(Tag.ID);
    let expectedType;
    if (this.look.tag === ':') {
      this.move();
      expectedType = this.baseType();
    }
    this.match('=');
    const expr = this.expr();
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

  declareExpr() {
    const begin = this.getIndex();
    this.match(Tag.VAR);
    const id = this.look;
    this.match(Tag.ID);
    let expectedType;
    if (this.look.tag === ':') {
      this.move();
      expectedType = this.baseType();
    }
    let expr;
    if (this.is('=')) {
      this.move();
      expr = this.expr();
    }
    const end = this.getIndex();
    return {
      type: 'declare_expr',
      id: id,
      expectedType,
      expr,
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

    return {
      type: 'param',
      paramName: paramName,
      paramType: paramType
    };
  }

  interfaceFun() {
    // function = [ Annotation ] ["static"] "funtion" functionName "("  [ params ]  ")" returnType functionBody
    const begin = this.getIndex();
    let isStatic = false;
    let hasThrow = false;
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
    this.match(';');
    let end = this.getIndex();

    return {
      type: 'function',
      isStatic: isStatic,
      isAsync: isAsync,
      hasThrow: hasThrow,
      functionName: functionName,
      params: params,
      returnType: returnType,
      tokenRange: [begin, end]
    };
  }

  fun() {
    // function = [ Annotation ] ["static"] "funtion" functionName "("  [ params ]  ")" returnType functionBody
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

  component() {
    let component;
    if (this.is(Tag.ID)) {
      component = this.look;
      this.move();
    } else if (this.is(Tag.PACK_ID)) {
      component = this.externComponent();
    } else {
      this.error(`expect (extern) module/model/interface`);
    }
    return component;
  }
}

module.exports = Parser;