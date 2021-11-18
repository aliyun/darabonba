'use strict';

const path = require('path');
const fs = require('fs');

const expect = require('expect.js');

const { parse } = require('..');

function pos(line, column) {
  return { line, column };
}

function loc(startLine, startColumn, endLine, endColumn) {
  return {
    start: pos(startLine, startColumn),
    end: pos(endLine, endColumn)
  };
}

function readAndParse(specPath) {
  const filePath = path.join(__dirname, specPath);
  return parse(fs.readFileSync(filePath, 'utf-8'), filePath);
}

describe('import', function () {

  it('no package.json should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_no_package_json/main.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the Darafile not exists`);
    });
  });

  it('import module duplicate should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_duplicate/main.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the module id "oss" has been imported`);
    });
  });

  it('import undefined module should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_undefined/main.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the import "oss" not defined in Darafile`);
    });
  });

  it('module instance should ok', function () {
    expect(function () {
      parse(`
function callOSS(): string {
  var client = new ossx();
  client.putObject();
  return "OK";
}`, '__filename');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the module "ossx" is not imported`);
    });
  });

  it('module call should be ok', function () {
    expect(function () {
      readAndParse('fixtures/import_ok/main.dara');
    }).to.not.throwException();

    expect(function () {
      readAndParse('fixtures/import_ok/variable_undefined.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`variable "test" undefined`);
    });
  });

  it('no init should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_without_init/main.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the module "OSS" don't has init`);
    });
  });

  it('parameter mismatch(for init call) should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_init_params/main.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the parameter types are mismatched. expected new OSS(string), but new OSS(boolean)`);
    });
  });

  it('undefined api/function should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_method_undefined/main.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the instance function/api "putObject" is undefined in OSS`);
    });
  });

  it('parameter mismatch(for static call) should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_call/main.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the parameter types are mismatched. expected OSS.putObject(boolean), but OSS.putObject(string)`);
    });
  });

  it('parameter matched should ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_call/parameter_matched.dara');
    }).to.not.throwException();
  });

  it('mismatch(extern model) should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_call/mismatch_extern_model.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the parameter types are mismatched. expected OSS.put(OSS#MyModel), but OSS.put()`);
    });
  });

  it('call static via instance call should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_call/call_static_method.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the instance function/api "staticPutObject" is undefined in OSS`);
    });
  });

  it('mismatch(module instance) should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_call/mismatch_module_instance.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the parameter types are mismatched. expected test(string), but test(OSS)`);
    });
  });

  it('return module should ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_call/return_module.dara');
    }).to.not.throwException();
  });

  it('return module model should ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_call/return_module_model.dara');
    }).to.not.throwException();
  });

  it('return inexist module model should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_call/return_inexist_module_model.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the model InExistModel is inexist in OSS`);
    });
  });

  it('use inexist static method should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_call_static/inexist.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the static function "inexist" is undefined in Assert`);
    });
  });

  it('use static method with non-static function should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_call_static/non_static.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the "equal" is not static function`);
    });
  });

  it('mismatch types in static call should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_call_static/mismatch.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the parameter types are mismatched. expected Assert.staticEqual(any, any, string), but Assert.staticEqual(string)`);
    });
  });

  it('static call should ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_call_static/ok.dara');
    }).to.not.throwException();
  });

  it('use not installed remote module should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_remote/main.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the module id "OSS" has not installed, use \`dara install\` first`);
    });
  });

  it('use not installed remote module(with lock file) should ok', function () {
    expect(function () {
      readAndParse('fixtures/import_not_installed_remote/main.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the module id "OSS" has not installed, use \`dara install\` first`);
    });
  });

  it('use installed remote module should ok', function () {
    expect(function () {
      readAndParse('fixtures/import_installed_remote/main.dara');
    }).to.not.throwException();
  });

  it('use module by old way should ok', function () {
    expect(function () {
      readAndParse('fixtures/import_by_tea/main.tea');
    }).to.not.throwException();
  });

  it('use undefined aliasId in construct module model should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_model/undefined_aliasid.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`expected "OSSX" is module or model`);
    });
  });

  it('use undefined model in construct module model should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_model/undefined_model.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the model "ConfigX" is undefined in module "OSS"`);
    });

    expect(function () {
      readAndParse('fixtures/import_module_model/undefined_sub_model.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the model "M.N.X" is undefined`);
    });
  });

  it('use undefined model in construct module model should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_model/module_call.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the return type is not expected, expect: void, actual: string`);
    });
  });

  it('use module as model field should ok', function () {
    const ast = readAndParse('fixtures/import_module_model/module_as_model_field.dara');
    const [ field ] = ast.models.M.modelBody.nodes;
    expect(field.fieldName.lexeme).to.be('oss');
    expect(field.fieldValue.fieldType.idType).to.be('module');
  });

  it('use module model as model field should ok', function () {
    const ast = readAndParse('fixtures/import_module_model/module_model_as_model_field.dara');
    const [ field ] = ast.models.M.modelBody.nodes;
    expect(field.fieldName.lexeme).to.be('config');
    expect(field.fieldValue.fieldType.type).to.be('moduleModel');
    const [moduleId] = field.fieldValue.fieldType.path;
    expect(moduleId.idType).to.be('module');
  });

  it('construct module model should ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_model/module_call_ok.dara');
    }).to.not.throwException();
  });

  it('set undefined field in construct module model should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_model/model_no_field.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the property "accessKeySecret" is undefined in model "OSS.Config"`);
    });
  });

  it('set mismatched type to field in construct module model should not ok', function () {
    expect(function () {
      readAndParse('fixtures/import_module_model/model_invalid_type.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the field type are mismatched. expected string, but integer`);
    });
  });

  it('extends unimported module should not ok', function () {
    expect(function () {
      readAndParse('fixtures/extends/extends_unimported.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the extends "OSS" wasn't imported`);
    });
  });

  it('extends imported module should ok', function () {
    expect(function () {
      readAndParse('fixtures/extends/main.dara');
    }).to.not.throwException();
  });

  it('super call should ok', function () {
    expect(function () {
      readAndParse('fixtures/extends/super.dara');
    }).to.not.throwException();

    expect(function () {
      readAndParse('fixtures/extends/super_types_mismatched.dara');
    }).to.throwException(function (e) {
      expect(e).to.be.a(SyntaxError);
      expect(e.message).to.be(`the parameter types are mismatched. expected OSS(string), but OSS(integer)`);
    });
  });

  it('id type(module, model, variable) should ok', function () {
    const ast = readAndParse('fixtures/variables/main.dara');
    const [, f1] = ast.moduleBody.nodes;
    const [, p1, p2, p3] = f1.functionBody.stmts.stmts;
    expect(p1.id.type).to.be('variable');
    expect(p2.id.type).to.be('model');
    expect(p3.id.type).to.be('module');
  });

  it('module instance should ok', function () {
    const ast = readAndParse('fixtures/module_instance/main.dara');
    const [f1] = ast.moduleBody.nodes;
    const [s1] = f1.functionBody.stmts.stmts;
    expect(s1).to.be.eql({
      'expr': {
        'aliasId': {
          'lexeme': 'OSS',
          'index': 13,
          'loc': loc(4, 14, 4, 17),
          'tag': 2
        },
        'args': [],
        'inferred': {
          'name': 'OSS',
          'parentModuleIds': [],
          'type': 'module_instance'
        },
        'tokenRange': [12, 16],
        'type': 'construct'
      },
      'loc': loc(4, 3, 5, 1),
      'needCast': false,
      'tokenRange': [11, 16],
      'type': 'return'
    });
  });
});
