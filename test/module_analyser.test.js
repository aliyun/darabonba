'use strict';
const assert = require('assert');

const Analyser = require('../lib/module_analyser');
const InterfaceAnalyser = require('../lib/interface_analyser');
const Parser = require('../lib/parser');
const Lexer = require('../lib/lexer');
const Package = require('../lib/package');

function parse(source, pkg = new Package()) {
  const lexer = new Lexer(source, '__filename');
  const parser = new Parser(lexer);
  const ast = parser.program();
  const name = ast.name.lexeme;
  pkg.components.set(name, {
    type: 'module',
    ast,
    ctx: {
      source,
      filename: '__filename'
    }
  });
  const anlyser = new Analyser({ source, filename: '__filename' }, pkg);
  anlyser.check(ast);
  pkg.components.get(name).analyser = anlyser;
  anlyser.checkMethods(ast);
  return ast;
}

function addComponent(pkg, source, filename) {
  const lexer = new Lexer(source, filename);
  const parser = new Parser(lexer);
  const ast = parser.program();
  const name = ast.name.lexeme;
  pkg.components.set(name, {
    type: ast.type,
    ast,
    ctx: {
      source: lexer.source,
      filename: lexer.filename
    },
  });
  if (ast.type === 'module') {
    const analyser = new Analyser({ source, filename: '__filename' }, pkg);
    analyser.check(ast);
    pkg.components.get(name).analyser = analyser;
  }

  if (ast.type === 'interface') {
    const analyser = new InterfaceAnalyser({ source, filename: '__filename' }, pkg);
    analyser.check(ast);
    pkg.components.get(name).analyser = analyser;
  }
}

describe('module analyser', function () {
  describe('import', function () {
    it('import undefined package should not ok', function () {
      assert.throws(() => {
        parse(`import $std; module M {}`);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `the package '$std' not defined in Darafile`);
        return true;
      });
    });

    it('re-import package should not ok', function () {
      assert.throws(() => {
        const pkg = new Package();
        pkg.libraries.set('$std', new Package());
        parse(`import $std; import $std; module M { }`, pkg);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `the package id '$std' has been imported`);
        return true;
      });
    });

    it('un-imported package should not ok', function () {
      assert.throws(() => {
        parse(`module M extends $std.M {}`);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `the package '$std' is un-imported`);
        return true;
      });
    });
  });

  describe('extends', function () {
    it('extends undefined extern module should not ok', function () {
      assert.throws(() => {
        const pkg = new Package();
        pkg.libraries.set('$std', new Package());
        parse(`
          import $std;
          module M extends $std.M {}`, pkg);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `'M' is undefined in '$std'`);
        return true;
      });
    });

    it('extends from extern model should not ok', function () {
      assert.throws(() => {
        const pkg = new Package();
        const $std = new Package();
        addComponent($std, `model M {}`, '__filename');
        pkg.libraries.set('$std', $std);
        parse(`
          import $std;
          module M extends $std.M {}`, pkg);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `'$std.M' is not a module`);
        return true;
      });
    });

    it('extends extern module should ok', function () {
      const pkg = new Package();
      const $std = new Package();
      addComponent($std, `module M {}`, '__filename');
      pkg.libraries.set('$std', $std);
      parse(`
        import $std;
        module M extends $std.M {}`, pkg);
    });

    it('extends undefined module should not ok', function () {
      assert.throws(() => {
        parse(`module M extends N {}`);
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `the type 'N' is undefined`);
        return true;
      });
    });

    it('extends model should not ok', function () {
      assert.throws(() => {
        const pkg = new Package();
        addComponent(pkg, `model N {}`, '__filename');
        parse(`module M extends N {}`, pkg);
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `'N' is not a module`);
        return true;
      });
    });

    it('extends self module should not ok', function () {
      assert.throws(() => {
        const pkg = new Package();
        addComponent(pkg, `module M extends M {}`, '__filename');
        // const parser = new Parser(lexer);
        // const ast = parser.program();
        // pkg.components.set('M', {
        //   type: 'module',
        //   ast,
        //   ctx: {
        //     source: lexer.source,
        //     filename: lexer.filename
        //   }
        // });
        parse(`module M extends M;`, pkg);
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `'M' can not extends itself`);
        return true;
      });
    });

    it('extends module should ok', function () {
      const pkg = new Package();
      addComponent(pkg, `module N {}`, '__filename');
      parse(`module M extends N {}`, pkg);
    });
  });

  describe('implements', function () {
    it('implements undefined extern module should not ok', function () {
      assert.throws(() => {
        const pkg = new Package();
        pkg.libraries.set('$std', new Package());
        parse(`
          import $std;
          module M implements $std.M {}`, pkg);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `'M' is undefined in '$std'`);
        return true;
      });
    });

    it('implements from extern model should not ok', function () {
      assert.throws(() => {
        const pkg = new Package();
        const $std = new Package();
        addComponent($std, `model M {}`, '__filename');
        pkg.libraries.set('$std', $std);
        parse(`
          import $std;
          module M implements $std.M {}`, pkg);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `'$std.M' is not a interface`);
        return true;
      });
    });

    it('implements extern inteface should ok', function () {
      const pkg = new Package();
      const $std = new Package();
      addComponent($std, `interface M {}`, '__filename');
      pkg.libraries.set('$std', $std);
      parse(`
        import $std;
        module M implements $std.M {}`, pkg);
    });

    it('implements undefined interface should not ok', function () {
      assert.throws(() => {
        parse(`module M implements N {}`);
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `the type 'N' is undefined`);
        return true;
      });
    });

    it('implements model should not ok', function () {
      assert.throws(() => {
        const pkg = new Package();
        addComponent(pkg, `model N {}`, '__filename');
        parse(`module M implements N {}`, pkg);
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `'N' is not a interface`);
        return true;
      });
    });

    it('implements interface should ok', function () {
      const pkg = new Package();
      addComponent(pkg, `interface N {}`, '__filename');
      parse(`module M implements N {}`, pkg);
    });

    it('duplicate implements interface should ok', function () {
      const pkg = new Package();
      addComponent(pkg, `interface N {}`, '__filename');
      assert.throws(() => {
        parse(`module M implements N, N {}`, pkg);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, `duplicate interface`);
        return true;
      });
    });

    it('implements interface(with methods) should not ok', function () {
      const pkg = new Package();
      addComponent(pkg, `
        interface N {
          function hello(): void;
        }`, '__filename');
      assert.throws(() => {
        parse(`module M implements N {}`, pkg);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, `must implement method N.hello()`);
        return true;
      });
    });

    it('async mismatch should not ok', function () {
      const pkg = new Package();
      addComponent(pkg, `
        interface N {
          function hello(): void;
        }`, '__filename');
      assert.throws(() => {
        parse(`module M implements N {
          init() {}
          async function hello(): void {

          }
        }`, pkg);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, `the async modifier mismatched`);
        return true;
      });
    });

    it('return type mismatch should not ok', function () {
      const pkg = new Package();
      addComponent(pkg, `
        interface N {
          function hello(): void;
        }`, '__filename');
      assert.throws(() => {
        parse(`module M implements N {
          init() {}
          function hello(): string {
            return '';
          }
        }`, pkg);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, `the return type mismatched, expect: void, but string`);
        return true;
      });
    });

    it('parameters mismatch should not ok', function () {
      const pkg = new Package();
      addComponent(pkg, `
        interface N {
          function hello(key: string, value: string): void;
        }`, '__filename');
      assert.throws(() => {
        parse(`module M implements N {
          init() {}
          function hello(key: string): void {
          }
        }`, pkg);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, `the parameter types mismatched, expect hello(string, string), but hello(string)`);
        return true;
      });
    });

    it('parameter types mismatch should not ok', function () {
      const pkg = new Package();
      addComponent(pkg, `
        interface N {
          function hello(value: string): void;
        }`, '__filename');
      assert.throws(() => {
        parse(`module M implements N {
          init() {}
          function hello(key: boolean): void {
          }
        }`, pkg);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, `the parameter types mismatched, expect hello(string), but hello(boolean)`);
        return true;
      });
    });
  });

  describe('define type', function () {
    it('redefine type should not ok', function () {
      assert.throws(() => {
        parse(`
          module M {
            type @id = string
            type @id = string
          }`);
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `redefined type '@id'`);
        return true;
      });
    });

    it('type should ok', function () {
      parse(`
        module M {
          type @id = string
        }`);
    });
  });

  describe('define init', function () {
    it('no init should ok', function () {
      parse(`module M { }`);
    });

    it('no init with instance method should not ok', function () {
      assert.throws(function () {
        parse(`
          module M {
            function test(): void;
          }`);
      }, function (e) {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `must have a init when there is a non-static function`);
        return true;
      });
    });

    it('init without body should ok', function () {
      parse(`module M { init(); }`);
    });

    it('more than one init should not ok', function () {
      assert.throws(function () {
        parse(`
          module M {
            init();
            init();
          }`);
      }, function (e) {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `only one init can be allowed.`);
        return true;
      });
    });

    it('init body should ok', function () {
      parse(`
        module M {
          init() {
          }
        }`);
    });
  });

  describe('define methods', function () {
    it('redefine function should not ok', function () {
      assert.throws(() => {
        parse(`
          module M {
            init() {}
            function getId(): string {
            }
            function getId(): string {
            }
          }`);
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `redefined function 'getId'`);
        return true;
      });
    });

    it('duplicate parameter name should not ok', function () {
      assert.throws(() => {
        parse(`
          module M {
            init() {}
            function call(a: string, a: string): void {
            }
          }`);
      }, function (e) { // get the exception object
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `redefined parameter 'a'`);
        return true;
      });
    });

    it('define function should ok', function () {
      parse(`
        module M {
          init() {}
          function getId(): string {
            return '';
          }
        }`);
    });
  });

  describe('statements', function () {
    describe('return', function () {
      it('return void should ok', function () {
        parse(`
          module M {
            init() {}
            function call(): void {
              return;
            }
          }`);
      });

      it('only can return void in init', function () {
        parse(`
        module M {
          init() {
            return;
          }
        }`);

        assert.throws(() => {
          parse(`
          module M {
            init() {
              return '';
            }
          }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `should not have return value in init method`);
          return true;
        });
      });

      it('mismatch type should not ok', function () {
        assert.throws(() => {
          parse(`
          module M {
            init() {}
            function call(): void {
              return '';
            }
          }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the return type is not expected, expect: void, actual: string`);
          return true;
        });
      });
    });

    describe('declare', function () {
      it('duplicated variable should not ok', function () {
        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                var id = "id";
                var id = "id";
              }
            }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the id 'id' was defined`);
          return true;
        });
      });

      it('declare null without type should not ok', function () {
        assert.throws(function () {
          parse(`
          module M {
            init() {}
            function call(): void {
              var id = null;
            }
          }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `must declare type when value is null`);
          return true;
        });
      });

      it('declare null with type should ok', function () {
        assert.doesNotThrow(function () {
          parse(`
          module M {
            init() {}
            function call(): void {
              var id: string = null;
              id;
            }
          }`);
        });
      });

      it('mismatch type should not ok', function () {
        assert.throws(function () {
          parse(`
          module M {
            init() {}
            function call(): void {
              var id: boolean = '';
            }
          }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `declared variable with mismatched type, expected: boolean, actual: string`);
          return true;
        });
      });

      it('match type should ok', function () {
        assert.doesNotThrow(function () {
          parse(`
          module M {
            init() {}
            function call(): void {
              var id: boolean = true;
              id;
            }
          }`);
        });
      });
    });

    describe('assign', function () {
      describe('assign to variable', function () {
        it('undefined variable should not ok', function () {
          assert.throws(function () {
            parse(`
            module M {
              init() {}
              function call(): void {
                id = '';
              }
            }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `id 'id' undefined`);
            return true;
          });
        });

        it('mismatch type should not ok', function () {
          assert.throws(function () {
            parse(`
            module M {
              init() {}
              function call(): void {
                var id: boolean = true;
                id = '';
              }
            }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `can not assign string to boolean`);
            return true;
          });
        });

        it('match type should ok', function () {
          assert.doesNotThrow(function () {
            parse(`
              module M {
              init() {}
              function call(): void {
                var id: boolean = true;
                id = false;
              }
            }`);
          });
        });
      });

      describe('assign to property', function () {
        it('undefined property should not ok', function () {
          assert.throws(function () {
            parse(`
            module M {
              init() {}
              function call(): void {
                @id = '';
              }
            }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `the property '@id' is undefined`);
            return true;
          });
        });

        it('mismatch type should not ok', function () {
          assert.throws(function () {
            parse(`
            module M {
              type @id = boolean;
              init() {}
              function call(): void {
                @id = '';
              }
            }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `can not assign string to boolean`);
            return true;
          });
        });

        it('match type should ok', function () {
          assert.doesNotThrow(function () {
            parse(`
            module M {
              type @id = boolean;
              init() {}
              function call(): void {
                @id = false;
              }
            }`);
          });
        });
      });

      describe('assign to model field', function () {
        it('assign to undefined model field should not ok', function () {
          const pkg = new Package();
          addComponent(pkg, `model Model {}`, '__filename');

          assert.throws(function () {
            parse(`
              module M {
                init();
                function call(): void {
                  var m = new Model{};
                  m.N = '';
                }
              }`, pkg);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `the field 'N' is undefined in model Model`);
            return true;
          });
        });

        it('assign to model field with mismatch type should not ok', function () {
          const pkg = new Package();
          addComponent(pkg, `model Model { N: boolean }`, '__filename');

          assert.throws(function () {
            parse(`
              module M {
                init() {}
                function call(): void {
                  var m = new Model{};
                  m.N = '';
                }
              }`, pkg);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `can not assign string to boolean`);
            return true;
          });
        });

        it('assign to model field should ok', function () {
          const pkg = new Package();
          addComponent(pkg, `model Model { N: boolean }`, '__filename');

          parse(`
            module M {
              init() {}
              function call(): void {
                var m = new Model{};
                m.N = true;
              }
            }`, pkg);
        });
      });

      describe('assign to map value', function () {

      });

      describe('assign to array item', function () {
        it('assign a value to array should be ok', function () {
          parse(`
            module M {
              static function main(): void {
                var configs = [1,2,3];
                configs[3] = 4;
              }
            }`);
        });

        it('multi-dimentional array assign check should be ok', function () {
          parse(`
            module M {
              static function main(): void {
                var mulArr: [[ string ]] = [ ['string'],['string'] ];
                mulArr[0][0] = 'string2';
              }
            }`);
        });
      });
    });

    describe('if', function () {
      it('if should ok', function () {
        assert.doesNotThrow(function () {
          parse(`
          module M {
            init() {}
            function call(): void {
              if (true) {

              }
            }
          }`);
        });

        assert.doesNotThrow(function () {
          parse(`
          module M {
            init() {}
            function call(): void {
              if (true) {
                
              } else {

              }
            }
          }`);
        });
      });
    });

    describe('throw', function () {
      it('throw should be ok', function () {
        assert.doesNotThrow(function () {
          parse(`
          module M {
            init() {}
            function call(): void {
              throw {};
            }
          }`);
        });
      });
    });

    describe('while', () => {
      it('while condition must be a boolean expr', function () {
        assert.throws(function () {
          parse(`
            module M {
              static function main(): void  {
                while (123) {
                }
              }
            }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'the condition expr must be boolean type');
          return true;
        });
      });

      it('condition is boolean should ok', function () {
        assert.doesNotThrow(function () {
          parse(`
            module M {
              static function test(): void  {
                while (true) {
                }
              }
            }`);
        });
      });
    });

    describe('for of', function () {
      it('the list is not array type should not ok', function () {
        assert.throws(function () {
          parse(`
            module M {
              static function test(): void  {
                for (var i of 123) {
                }
              }
            }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'the list in for must be array type');
          return true;
        });
      });

      it('the list is array type should be ok', function () {
        parse(`
          module M {
            static function test(): void  {
              for (var i of []) {
              }
            }
          }`);
      });
    });

    describe('for', function () {
      it('for with empty should be ok', function () {
        parse(`
          module M {
            static function test(): void  {
              for ( ; ; ) {
              }
            }
          }`);
      });

      it('test expr is non-boolean should not ok', function () {
        assert.throws(function () {
          parse(`
            module M {
              static function call(): void {

              }
              static function test(): void  {
                for ( ; call(); ) {
                }
              }
            }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'the test expr must be boolean type');
          return true;
        });
      });

      it('init expr(declare) should ok', function () {
        parse(`
          module M {
            static function test(): void  {
              for (var i = 0; ; ) {
                i;
              }
            }
          }`);

        assert.throws(function () {
          parse(`
            module M {
              static function test(): void  {
                for (var i: string = 0; ; ) {
                }
              }
            }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: string, actual: integer');
          return true;
        });
      });

      it('init expr(declare with null) should not ok', function () {
        assert.throws(function () {
          parse(`
            module M {
              static function test(): void  {
                for (var i = null; ; ) {
                }
              }
            }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'must declare type when value is null');
          return true;
        });

        parse(`
          module M {
            static function test(): void  {
              for (var i: int32 = null; ; ) {
                i;
              }
            }
          }`);
      });
    
      it('init expr(assign) should ok', function () {
        parse(`
          module M {
            static function test(): void {
              var i = 0;
              for (i = 0; ; ) {
                i;
              }
            }
          }`);
      });

      it('test expr should ok', function () {
        parse(`
          module M {
            static function test(): void {
              var i = 0;
              for (i = 0; i < 10; ) {
                i;
              }
            }
          }`);

        assert.throws(function () {
          parse(`
            module M {
              static function call(): void {

              }
              static function test(): void  {
                var i = 0;
                for (i = 0; i < 'string'; ) {
                  i;
                }
              }
            }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'the right expr type(string) mismatch with left expr type(integer)');
          return true;
        });
      });
    });

    describe('break', function () {
      it('while with break should ok', function () {
        assert.doesNotThrow(function () {
          parse(`
            module M {
              static function test(): void  {
                while (true) {
                  break;
                }
              }
            }`);
        });
      });

      it('for with break should be ok', function () {
        assert.doesNotThrow(function () {
          parse(`
            module M {
              static function test(): void  {
                for (var i of []) {
                }
              }
            }`);
        });
      });
    });

    describe('try', function () {
      it('try/catch should ok', function () {
        assert.doesNotThrow(function () {
          parse(`
            module M {
              static function func(): void  {
                try {
                } catch(ex) {
                }
              }
            }`);
        });
      });

      it('try/finally should ok', function () {
        assert.doesNotThrow(function () {
          parse(`
            module M {
              static function func(): void  {
                try {
                } finally {
                }
              }
            }`);
        });
      });

      it('try/catch/finally should ok', function () {
        assert.doesNotThrow(function () {
          parse(`
            module M {
              static function func(): void  {
                try {
                } catch (ex) {
                } finally {
                }
              }
            }`);
        });
      });
    });

    describe('expr', function () {
      it('$pkg should not ok', function () {
        const $std = new Package();
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        assert.throws(function () {
          parse(`
            import $std;
            module M {
              static function func(): void  {
                $std;
              }
            }`, pkg);
        }, (e) => {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, 'invalid expression');
          return true;
        });
      });

      it('Module should not ok', function () {
        assert.throws(function () {
          parse(`
            module M {
              static function func(): void  {
                M;
              }
            }`);
        }, (e) => {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, 'invalid expression');
          return true;
        });
      });

      it('Model should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, 'model X {}', '__filename');
        assert.throws(function () {
          parse(`
            module M {
              static function func(): void  {
                X;
              }
            }`, pkg);
        }, (e) => {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, 'invalid expression');
          return true;
        });
      });
    });
  });

  describe('sample expressions', function () {
    it('string should ok', function () {
      parse(`
        module M {
          init() {}
          function call(): void {
            'string';
          }
        }`);
    });

    it('number should ok', function () {
      parse(`
        module M {
          init() {}
          function call(): void {
            123;
          }
        }`);
    });

    it('boolean should ok', function () {
      parse(`
        module M {
          init() {}
          function call(): void {
            true;
          }
        }`);
    });

    it('null should ok', function () {
      parse(`
        module M {
          init() {}
          function call(): void {
            null;
          }
        }`);
    });

    it('template_string should ok', function () {
      parse(`
        module M {
          init() {}
          function call(): void {
            \`\`;
          }
        }`);

      parse(`
        module M {
          init() {}
          function call(): void {
            \`abc\${'abc'}\`;
          }
        }`);
    });

    it('array should ok', function () {
      parse(`
        module M {
          init() {}
          function call(): void {
            [];
          }
        }`);

      parse(`
        module M {
          init() {}
          function call(): void {
            [1];
          }
        }`);
    });

    it('access array should ok', function () {
      parse(`
        module M {
          static function call(): void {
            var m = [[]];
            m[123];
            m[123][456];
          }
        }`);
    });

    it('map should ok', function () {
      parse(`
        module M {
          init() {}
          function call(): void {
            {};
          }
        }`);

      parse(`
        module M {
          init() {}
          function call(): void {
            {
              'key' = 'value'
            };
          }
        }`);

      parse(`
        module M {
          init() {}
          function call(): void {
            {
              ...{
              }
            };
          }
        }`);

      assert.throws(function () {
        parse(`
          module M {
            init() {}
            function call(): void {
              {
                ...123
              };
            }
          }`);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, 'can not expand non-map expression');
        return true;
      });
    });
  });

  describe('complex expressions', function () {
    describe('construct model', function () {
      it('undefined model should not ok', function () {
        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                new Model{};
              }
            }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the type 'Model' is undefined`);
          return true;
        });
      });

      it('module should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, `module Model {}`, '__filename');
        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                new Model{};
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `'Model' is not a model`);
          return true;
        });
      });

      it('defined model should ok', function () {
        const pkg = new Package();
        addComponent(pkg, `model Model {}`, '__filename');

        parse(`
          module M {
            init() {}
            function call(): void {
              new Model{};
            }
          }`, pkg);
      });

      it('assign to undefined model field should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, `model Model {}`, '__filename');

        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                new Model{
                  N = ''
                };
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the field 'N' is undefined in model 'Model'`);
          return true;
        });
      });

      it('assign to model field with mismatch type should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, `model Model { N: boolean }`, '__filename');

        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                new Model{
                  N = ''
                };
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the field type are mismatched. expected boolean, but string`);
          return true;
        });
      });

      it('assign to model field should ok', function () {
        const pkg = new Package();
        addComponent(pkg, `model Model { N: boolean }`, '__filename');

        assert.doesNotThrow(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                new Model{
                  N = true
                };
              }
            }`, pkg);
        });
      });
    });

    describe('construct module', function () {
      it('undefined module should not ok', function () {
        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                new Module();
              }
            }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the type 'Module' is undefined`);
          return true;
        });
      });

      it('model should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, `model Module {}`, '__filename');

        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                new Module();
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `'Module' is not a module`);
          return true;
        });
      });

      it('no init module should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, `module Module {}`, '__filename');

        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                new Module();
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the module 'Module' has no init`);
          return true;
        });
      });

      it('init with mismatch types should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, `
          module Module {
            init(a: string) {

            }
          }`, '__filename');

        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                new Module();
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the parameter types are mismatched. expected new Module(string), but new Module()`);
          return true;
        });

        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                new Module(true);
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the parameter types are mismatched. expected new Module(string), but new Module(boolean)`);
          return true;
        });
      });

      it('defined module should ok', function () {
        const pkg = new Package();
        addComponent(pkg, `module Module { init() {} }`, '__filename');
        parse(`
          module M {
            init() {}
            function call(): void {
              new Module();
            }
          }`, pkg);
      });
    });

    describe('call in module', function () {
      it('call undefined function should not ok', function () {
        assert.throws(() => {
          parse(`
            module M {
              init() {}
              function callId(): string {
                return callx();
              }
            }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the function 'callx' is undefined`);
          return true;
        });
      });

      it('call with mismatch types should not ok', function () {
        assert.throws(() => {
          parse(`
            module M {
              init() {}
              function callx(x: boolean): void {
              }
              function callId(): void {
                callx('hehe');
              }
            }`);
        }, function (e) { // get the exception object
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the parameter types are mismatched. expected callx(boolean), but callx(string)`);
          return true;
        });
      });

      it('call function should be ok', function () {
        assert.doesNotThrow(() => {
          parse(`
            module M {
              init() {}
              function callx(x: boolean): void {
              }
              function callId(): void {
                callx(true);
              }
            }`);
        });
      });

      it('async function in sync function should not ok', function () {
        assert.throws(function () {
          parse(`
            module M {
              init() {}
              async function af(): void {
              }
              function sf(): void {
                return af();
              }
            }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the async function only can be used in async function`);
          return true;
        });
      });

      it('sync function in async function should ok', function () {
        parse(`
          module M {
            init() {}
            function sf(): void {
            }
            async function af(): void {
              return sf();
            }
          }`);
      });

      it('instance function in static function should not ok', function () {
        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function ifun(): void {
              }
              static function sfun(): void {
                return ifun();
              }
            }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the function can not be used in static function`);
          return true;
        });
      });

      it('static function in instance function should ok', function () {
        parse(`
          module M {
            init() {}
            static function sf(): void {
            }
            function af(): void {
              return sf();
            }
          }`);
      });
    });

    describe('inline call in module', function () {
      describe('#append', function () {
        it('#append with invalid length should not ok', function () {
          assert.throws(() => {
            parse(`
              module M {
                init() {}
                static function test(): void {
                  var list: [string] = [];
                  #append(list, 'item', 'item2');
                }
              }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `the #append parameter length expect 2, but 3`);
            return true;
          });
        });

        it('#append with invalid type should not ok', function () {
          assert.throws(() => {
            parse(`
              module M {
                init() {}
                static function test(): void {
                  var list: map[string]string = {};
                  #append(list, 'item');
                }
              }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `must be array type`);
            return true;
          });

          assert.throws(() => {
            parse(`
              module M {
                init() {}
                static function test(): void {
                  var list: [string] = [];
                  #append(list, 1);
                }
              }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `the item type is not match with list`);
            return true;
          });
        });

        it('#append should ok', function () {
          parse(`
            module M {
              init() {}
              static function test(): void {
                var list: [string] = [];
                #append(list, 'item');
              }
            }`);
        });
      });

      describe('#delete', function () {
        it('#delete with invalid length should not ok', function () {
          assert.throws(() => {
            parse(`
              module M {
                init() {}
                static function test(): void {
                  var m: map[string]string = {};
                  #delete(m, 'item', 'item2');
                }
              }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `the #delete parameter length expect 2, but 3`);
            return true;
          });
        });

        it('#delete with invalid type should not ok', function () {
          assert.throws(() => {
            parse(`
              module M {
                init() {}
                static function test(): void {
                  var m: [string] = [];
                  #delete(m, 'item');
                }
              }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `must be map type`);
            return true;
          });

          assert.throws(() => {
            parse(`
              module M {
                init() {}
                static function test(): void {
                  var m: map[string]string = {};
                  #delete(m, 1);
                }
              }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `must be string type`);
            return true;
          });
        });

        it('#delete should ok', function () {
          parse(`
            module M {
              init() {}
              static function test(): void {
                var m: map[string]string = {};
                #delete(m, 'item');
              }
            }`);
        });
      });

      describe('#length', function () {
        it('#length with invalid length should not ok', function () {
          assert.throws(() => {
            parse(`
              module M {
                init() {}
                static function test(): void {
                  var list: [string] = [];
                  #length(list, 1);
                }
              }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `the #length parameter length expect 1, but 2`);
            return true;
          });
        });

        it('#length with invalid type should not ok', function () {
          assert.throws(() => {
            parse(`
              module M {
                init() {}
                static function test(): void {
                  var m: map[string]string = {};
                  #length(m);
                }
              }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `must be array type`);
            return true;
          });
        });

        it('#length should ok', function () {
          parse(`
            module M {
              init() {}
              static function test(): void {
                var list: [string] = [];
                #length(list);
              }
            }`);
        });
      });
      
      describe('#unsupport', function () {
        it('#unsupport should not ok', function () {
          assert.throws(() => {
            parse(`
              module M {
                init() {}
                static function test(): void {
                  var m: map[string]string = {};
                  #unsupport(m, 'item', 'item2');
                }
              }`);
          }, function (e) {
            assert.ok(e instanceof SyntaxError);
            assert.deepStrictEqual(e.message, `un-supported inline call(#unsupport)`);
            return true;
          });
        });
      });
    });

    describe('static call with another module', function () {
      it('call undefined method should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, `module M1 {}`, '__filename');

        assert.throws(function () {
          parse(`
            module M {
              init();
              function call(): void {
                M1.test();
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the method 'test' is undefined in module 'M1'`);
          return true;
        });
      });

      it('call non-static method should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, `
          module M1 {
            init() {}
            function test(): void {

            }
          }`, '__filename');

        assert.throws(function () {
          parse(`
            module M {
              init();
              function call(): void {
                M1.test();
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `'M1.test' is not static method`);
          return true;
        });
      });

      it('call static method should be ok', function () {
        const pkg = new Package();
        addComponent(pkg, `
          module M1 {
            init() {}
            static function test(): void {
            }
          }`, '__filename');

        parse(`
          module M {
            init();
            function call(): void {
              M1.test();
            }
          }`, pkg);
      });
    });

    describe('instance call with another module', function () {
      it('call instance method with undefined method should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, `module Module { init() {} }`, '__filename');
        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                var m = new Module();
                m.create('name');
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the method 'create' is undefined in module 'Module'`);
          return true;
        });
      });

      it('call instance method with static method should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, `
          module Module {
            init() {}
            static function create(b: boolean): void {
            }
          }`, '__filename');
        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                var m = new Module();
                m.create('name');
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `'Module.create' is static method`);
          return true;
        });
      });

      it('call instance method with mismatched types should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, `
          module Module {
            init() {}
            function create(b: boolean): void {
            }
          }
        `, '__filename');
        assert.throws(function () {
          parse(`
            module M {
              init() {}
              function call(): void {
                var m = new Module();
                m.create('name');
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the parameter types are mismatched. expected m.create(boolean), but m.create(string)`);
          return true;
        });
      });

      it('call instance method should ok', function () {
        const pkg = new Package();
        addComponent(pkg, `
          module Module {
            init() {}
            function create(b: boolean): void {
            }
          }`, '__filename');

        parse(`
          module M {
            init() {}
            function call(): void {
              var m = new Module();
              m.create(true);
            }
          }`, pkg);
      });
    });

    describe('and/or expr', function () {
      it('should check and/or expr', function () {
        parse(`
          module M {
            static function less(a: int32, b: int32): boolean;
            static function great(a: int32, b: int32): boolean;
            static function between(input: int32, min: int32, max: int32): string {
              if (great(input, min) && less(input, max)) {
                return "yes";
              }
              return "no";
            }
          }`);

        assert.doesNotThrow(function () {
          parse(`
            module M {
              static function is(a: int32, b: int32): boolean;
              static function oneOf(input: int32, min: int32, max: int32): string {
                if (is(input, max) || is(input, min)) {
                  return "yes";
                }
                return "no";
              }
            }`);
        });

        assert.throws(function () {
          parse(`
            module M {
              static function oneOf(input: int32, min: int32, max: int32): string {
                if ("string1" || "string2") {
                  return "yes";
                }
                return "no";
              }
            }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'the left expr must be boolean type');
          return true;
        });

        assert.throws(function () {
          parse(`
            module M {
              static function oneOf(input: int32, min: int32, max: int32): string {
                if (true || "string2") {
                  return "yes";
                }
                return "no";
              }
            }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'the right expr must be boolean type');
          return true;
        });
      });
    });

    describe('not expr', function () {
      it('not expr should ok', function () {
        assert.doesNotThrow(function () {
          parse(`
            module M {
              static function callOSS(): boolean {
                return !true;
              }
            }`);
        });

        assert.throws(function () {
          parse(`
          module M {
            static function callOSS(): boolean {
              return !'string';
            }
          }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'the expr after ! must be boolean type');
          return true;
        });
      });
    });

    describe('property', function () {
      it('access non-model/module/package with . should not ok', function () {
        assert.throws(function () {
          parse(`
          module M {
            static function hello(): void {
              var a = {
              };
              a.b;
            }
          }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, `only can use '.' after a`);
          return true;
        });

        assert.throws(() => {
          parse(`
          module M {
            static function hello(a: string): void {
              a.b;
            }
          }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, `only can use '.' after a`);
          return true;
        });
      });

      it('access model.x should not ok', function () {
        const pkg = new Package();
        addComponent(pkg, 'model X {}', '__filename');
        assert.throws(function () {
          parse(`
          module M {
            static function hello(): void {
              X.hehe;
            }
          }`, pkg);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, `only can use '.' after X`);
          return true;
        });
      });
    });

    describe('member', function () {
      it('map access should be ok', function () {
        assert.throws(function () {
          parse(`
          module M {
            static function hello(): void {
              var a = {};
              var key = 1;
              a[key];
            }
          }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'the expr must be string type for map');
          return true;
        });

        parse(`
          module M {
            static function hello(): void {
              var a = {};
              var key = 'str';
              a[key];
            }
          }`);

        parse(`
          module M {
            static function hello(): void {
              var a = {
                'b' = {}
              };
              var key = 'str';
              a['b'][key];
            }
          }`);
      });

      it('array access should be ok', function () {
        assert.throws(function () {
          parse(`
          module M {
            static function hello(): void {
              var a = [1, 2, 3];
              var key = 'str';
              a[key];
            }
          }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'the expr must be integer type for array');
          return true;
        });

        parse(`
          module M {
            static function hello(): void {
              var a = [1, 2, 3];
              var key = 1;
              a[key];
            }
          }`);
      });

      it('use [] with non-array/map should not ok', function () {
        assert.throws(function () {
          parse(`
          module M {
            static function hello(): void {
              var a = 'hehe';
              var key = 'str';
              a[key];
            }
          }`);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'the [] form only support map or array type');
          return true;
        });
      });
    });

    describe('to expr', function () {
      it('left expr must be map', function () {
        assert.throws(function () {
          const pkg = new Package();
          addComponent(pkg, `model Model {}`, '__filename');
          parse(`
          module M {
            static function callOSS(): boolean {
              return 123 to Model;
            }
          }`, pkg);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, 'only map can work with model');
          return true;
        });
      });

      it('to type must be model', function () {
        assert.throws(function () {
          const pkg = new Package();
          addComponent(pkg, `module N {}`, '__filename');
          parse(`
          module M {
            static function callOSS(): boolean {
              return {} to N;
            }
          }`, pkg);
        }, (ex) => {
          assert.ok(ex instanceof SyntaxError);
          assert.deepStrictEqual(ex.message, `'N' is not a model`);
          return true;
        });
      });

      it('to expr should ok', function () {
        const pkg = new Package();
        addComponent(pkg, `model Model {}`, '__filename');
        parse(`
          module M {
            static function call(): Model {
              return {} to Model;
            }
          }`, pkg);
      });
    });
  });

  describe('static method & property', function () {
    it('static method with property should not ok', function () {
      assert.throws(function () {
        parse(`
          module M {
            type @call = void;
            static function func(): void {
              return @call;
            }
          }`);
      }, function (e) {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `the module property can not used in static function`);
        return true;
      });
    });
  });

  describe('super', function () {
    it('super not in init should not ok', function () {
      assert.throws(function () {
        parse(`
        module M {
          static function hello(): void {
            super();
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'super only allowed in init method');
        return true;
      });
    });

    it('super without parent module should not ok', function () {
      assert.throws(function () {
        parse(`
        module M {
          init() {
            super();
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'this module have no parent module');
        return true;
      });
    });

    it('parent module have no init should not ok', function () {
      const pkg = new Package();
      addComponent(pkg, 'module N {}', '__filename');

      assert.throws(function () {
        parse(`
          module M extends N {
            init() {
              super();
            }
          }`, pkg);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, `the parent module 'N' have no init method`);
        return true;
      });
    });

    it('super with mismatched types should not ok', function () {
      const pkg = new Package();
      addComponent(pkg, 'module N { init(a: string) {} }', '__filename');

      assert.throws(function () {
        parse(`
        module M extends N {
          init() {
            super(true);
          }
        }`, pkg);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, `the parameter types are mismatched. expected N(string), but N(boolean)`);
        return true;
      });
    });

    it('super should ok', function () {
      const pkg = new Package();
      addComponent(pkg, 'module N { init() {} }', '__filename');

      parse(`
        module M extends N {
          init() {
            super();
          }
        }`, pkg);
    });
  });

  describe('__this', function () {
    it('__this in function should ok', function () {
      parse(`
        module M {
          init() {}
          function func(): M {
            return __this;
          }
        }`);
    });

    it('__this in static function should not ok', function () {
      assert.throws(function () {
        parse(`
          module M {
            static function func(): M {
              return __this;
            }
          }`);
      }, function (e) {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `id '__this' undefined`);
        return true;
      });
    });
  });

  describe('type inferred', function () {
    it('inferred for map should ok', function () {
      function getMapInferred(expr) {
        const ast = parse(`
          module M {
            static function hello(): void {
              var a = ${expr};
              a; // use it
            }
          }`);
        const [f1] = ast.moduleBody.nodes;
        const [s1] = f1.functionBody.stmts.stmts;
        return s1.expr.inferred;
      }

      assert.deepStrictEqual(getMapInferred('{}'), {
        'keyType': {
          'name': 'string',
          'type': 'basic'
        },
        'type': 'map',
        'valueType': {
          'name': 'any',
          'type': 'basic'
        }
      });

      assert.deepStrictEqual(getMapInferred(`{'key' = 'value'}`), {
        'keyType': {
          'name': 'string',
          'type': 'basic'
        },
        'type': 'map',
        'valueType': {
          'name': 'string',
          'type': 'basic'
        }
      });

      assert.deepStrictEqual(getMapInferred(`{'key' = 'value', 'key2' = 1}`), {
        'keyType': {
          'name': 'string',
          'type': 'basic'
        },
        'type': 'map',
        'valueType': {
          'name': 'any',
          'type': 'basic'
        }
      });

      function getMapInferredEx(expr1, expr2) {
        const ast = parse(`
          module M {
            static function hello(): void {
              var a = ${expr1};
              var b = ${expr2};
              a; b; // use them
            }
          }`);
        const [f1] = ast.moduleBody.nodes;
        const [ , s2] = f1.functionBody.stmts.stmts;
        return s2.expr.inferred;
      }
      assert.deepStrictEqual(getMapInferredEx(`{'key' = 'value'}`, `{'key2' = 123, ...a}`), {
        'keyType': {
          'name': 'string',
          'type': 'basic'
        },
        'type': 'map',
        'valueType': {
          'name': 'any',
          'type': 'basic'
        }
      });
    });

    it('inferred for array should ok', function () {
      function getArrayInferred(expr) {
        const ast = parse(`
          module M {
            static function hello(): void {
              var a = ${expr};
              a;
            }
          }`);
        const [f1] = ast.moduleBody.nodes;
        const [s1] = f1.functionBody.stmts.stmts;
        return s1.expr.inferred;
      }

      assert.deepStrictEqual(getArrayInferred('[]'), {
        'type': 'array',
        'itemType': {
          'name': 'any',
          'type': 'basic'
        }
      });

      assert.deepStrictEqual(getArrayInferred(`['value']`), {
        'type': 'array',
        'itemType': {
          'name': 'string',
          'type': 'basic'
        }
      });

      assert.deepStrictEqual(getArrayInferred(`['value', 1]`), {
        'type': 'array',
        'itemType': {
          'name': 'any',
          'type': 'basic'
        }
      });
    });
  });

  describe('assignable', function () {
    it('var arr: [ string ] = [] should ok', function () {
      parse(`
        module M {
          init() {
            var empty: [string] = [];
          }
        }`);
    });

    it('var arr: [ string ] = [1] should not ok', function () {
      assert.throws(function () {
        parse(`
          module M {
            init() {
              var empty: [string] = [1];
            }
          }`);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, 'declared variable with mismatched type, expected: [string], actual: [integer]');
        return true;
      });
    });

    it('var arr: map[string]string = {} should ok', function () {
      parse(`
        module M {
          init() {
            var empty: map[string]string = {};
          }
        }`);
    });

    it('var arr: map[string]string = { number } should not ok', function () {
      assert.throws(function () {
        parse(`
          module M {
            init() {
              var empty: map[string]string = {
                'key' = 1
              };
            }
          }`);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, 'declared variable with mismatched type, expected: map[string]string, actual: map[string]integer');
        return true;
      });
    });

    it('number type check in assign expr should ok', function () {
      parse(`
        module M {
          init() {
            var num: int32 = 123;
          }
        }`);

      parse(`
        module M {
          init() {
            var num: [ integer ] = [ 123 ];
          }
        }`);

      parse(`
        module M {
          init() {
            var num: map[ string ] integer = {
              'val' = 123
            };
          }
        }`);

      parse(`
        module M {
          init() {
            var intNum: integer = 123;
          }
        }`);

      parse(`
        module M {
          init() {
            var intArr: [ integer ] = [ 123 ];
          }
        }`);
    
      parse(`
        module M {
          init() {
            var intMap: map[string]integer = {
              'val' = 123
            };
          }
        }`);

      parse(`
        module M {
          init() {
            var int8Num: int8 = 123;
          }
        }`);

      parse(`
        module M {
          init() {
            var uint8Num: uint8 = 123;
          }
        }`);

      parse(`
        module M {
          init() {
            var int16Num: int16 = 123;
          }
        }`);

      parse(`
        module M {
          init() {
            var uint16Num: uint16 = 123;
          }
        }`);

      parse(`
        module M {
          init() {
            var int32Num: int32 = 123;
          }
        }`);

      parse(`
        module M {
          init() {
            var uint32Num: uint32 = 123;
          }
        }`);

      parse(`
        module M {
          init() {
            var int64Num: int64 = 123;
          }
        }`);

      parse(`
        module M {
          init() {
            var uint64Num: uint64 = 123;
          }
        }`);

      parse(`
        module M {
          init() {
            var longNum: long = 123L;
          }
        }`);

      parse(`
        module M {
          init() {
            var longArr: [ long ] = [ 123L ];
          }
        }`);

      parse(`
        module M {
          init() {
            var longMap: map[string] long = {
              'val' = 123L
            };
          }
        }`);
  
      parse(`
        module M {
          init() {
            var ulongNum: ulong = 123L;
          }
        }`);
  
      parse(`
        module M {
          init() {
            var longNum: long = 123;
          }
        }`);
  
      parse(`
        module M {
          init() {
            var ulongNum: ulong = 123;
          }
        }`);

      parse(`
        module M {
          init() {
            var floatNum: float = 1.23;
          }
        }`);

      parse(`
        module M {
          init() {
            var floatArr: [ float ] = [ 1.23 ];
          }
        }`);

      parse(`
        module M {
          init() {
            var floatMap: map[string] float = {
              'val' = 1.23
            };
          }
        }`);
  
      parse(`
        module M {
          init() {
            var doubleNum: double = 1.23d;
          }
        }`);

      assert.throws(function () {
        parse(`
          module M {
          init() {
            var intNum: integer = 1.23;
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: integer, actual: float');
        return true;
      });
  
      assert.throws(function () {
        parse(`
          module M {
            init() {
              var intNum: integer = 1.23d;
            }
          }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: integer, actual: double');
        return true;
      });
  
      assert.throws(function () {
        parse(`
          module M {
            init() {
              var intNum: integer = 123L;
            }
          }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: integer, actual: long');
        return true;
      });
  
      assert.throws(function () {
        parse(`
          module M {
            init() {
              var floatNum: float = 123;
            }
          }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: float, actual: integer');
        return true;
      });
  
      assert.throws(function () {
        parse(`
          module M {
            init() {
              var floatNum: float = 1.23d;
            }
          }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: float, actual: double');
        return true;
      });
  
      assert.throws(function () {
        parse(`
          module M {
            init() {
              var floatNum: float = 123L;
            }
          }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: float, actual: long');
        return true;
      });
  
      assert.throws(function () {
        parse(`
        module M {
          init() {
            var doubleNum: double = 1.23;
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: double, actual: float');
        return true;
      });

      assert.throws(function () {
        parse(`
        module M {
          init() {
            var doubleNum: double = 123;
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: double, actual: integer');
        return true;
      });
  
      assert.throws(function () {
        parse(`
          module M {
            init() {
              var doubleNum: double = 123L;
            }
          }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: double, actual: long');
        return true;
      });
  
      assert.throws(function () {
        parse(`
          module M {
            init() {
              var longNum: long = 1.23;
            }
          }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: long, actual: float');
        return true;
      });
  
      assert.throws(function () {
        parse(`
          module M {
            init() {
              var longNum: long = 1.23d;
            }
          }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: long, actual: double');
        return true;
      });
    });

    it('assign to any should ok', function () {
      parse(`
        module M {
          init() {
            var num: any = 123;
          }
        }`);
    });

    it('assign null should ok', function () {
      parse(`
        module M {
        init() {
          var str: string = '';
          str = null;
        }
      }`);
    });

    it('assign to same model should ok', function () {
      const pkg = new Package();
      addComponent(pkg, `model X {}`, '__filename');
      parse(`
        module M {
        init() {
          var x: X = new X{};
        }
      }`, pkg);
    });

    it('assign model to string should not ok', function () {
      const pkg = new Package();
      addComponent(pkg, `model X {}`, '__filename');
      assert.throws(function () {
        parse(`
        module M {
        init() {
          var str: string = new X{};
        }
      }`, pkg);
      }, function (e) {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `declared variable with mismatched type, expected: string, actual: X`);
        return true;
      });
    });

    it('assign array to string should not ok', function () {
      assert.throws(function () {
        parse(`
        module M {
        init() {
          var str: string = [];
        }
      }`);
      }, function (e) {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `declared variable with mismatched type, expected: string, actual: [any]`);
        return true;
      });
    });

    it('assign map to string should not ok', function () {
      assert.throws(function () {
        parse(`
        module M {
        init() {
          var str: string = {};
        }
      }`);
      }, function (e) {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `declared variable with mismatched type, expected: string, actual: map[string]any`);
        return true;
      });
    });

    it('assign model instance to model should ok', function () {
      const pkg = new Package();
      addComponent(pkg, `model X {}`, '__filename');
      parse(`
        module M {
        init() {
          var str: X = new X{};
        }
      }`, pkg);
    });

    it('assign module instance to string should not ok', function () {
      const pkg = new Package();
      addComponent(pkg, `module X { init() {} }`, '__filename');
      assert.throws(function () {
        parse(`
        module M {
        init() {
          var str: string = new X();
        }
      }`, pkg);
      }, function (e) {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `declared variable with mismatched type, expected: string, actual: X`);
        return true;
      });
    });

    it('assign module instance to module should ok', function () {
      const pkg = new Package();
      addComponent(pkg, `module X { init() {} }`, '__filename');
      parse(`
        module M {
        init() {
          var str: X = new X();
        }
      }`, pkg);
    });

    it('assign sub-module to module should not ok', function () {
      const pkg = new Package();
      addComponent(pkg, `module X { init() {} }`, '__filename');
      addComponent(pkg, `module Y extends X { init() {} }`, '__filename');
      assert.throws(() => {
        parse(`
          module M {
            init() {
              var str: X = new Y();
            }
          }`, pkg);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'declared variable with mismatched type, expected: X, actual: Y');
        return true;
      });
    });

    it('assign model to $model should ok', function () {
      const pkg = new Package();
      addComponent(pkg, `model X {}`, '__filename');
      const $builtin = new Package();
      addComponent($builtin, `model Model {}`, '__filename');
      pkg.libraries.set('$builtin', $builtin);
      parse(`
        import $builtin;
        module M {
          init() {
            var str: $builtin.Model = new X{};
          }
        }`, pkg);
    });

    it('assign model to model(extern model) should ok', function () {
      const pkg = new Package();
      addComponent(pkg, `model X {}`, '__filename');
      const pkg2 = new Package();
      pkg2.libraries.set('$std', pkg);
      parse(`
        import $std;
        module M {
          init() {
            var str: $std.X = new $std.X{};
          }
        }`, pkg2);
    });

    it('assign module instance to interface should ok', function () {
      const pkg = new Package();
      addComponent(pkg, `interface X { }`, '__filename');
      parse(`
      module M implements X {
        init() {
        }

        static function test(): X {
          return new M();
        }
      }`, pkg);
    });

    it('assign module instance to interface(not implemented) should ok', function () {
      const pkg = new Package();
      addComponent(pkg, `interface X { }`, '__filename');
      assert.throws(() => {
        parse(`
          module M  {
            init() {
            }
    
            static function test(): X {
              return new M();
            }
          }`, pkg);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, `the return type is not expected, expect: X, actual: M`);
        return true;
      });
    });
  });

  describe('call', function () {
    it('call with vid should not ok', function () {
      assert.throws(function () {
        parse(`
          module M {
            type @test = string;
            init();
            function call(): void {
              @test();
            }
          }`);
      }, function (e) {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `can not call with property`);
        return true;
      });
    });

    it('call with $package should not ok', function () {
      const std = new Package();

      assert.throws(function () {
        const pkg = new Package();
        pkg.libraries.set('$std', std);
        parse(`
          import $std;
          module M {
            init();
            function call(): void {
              $std();
            }
          }`, pkg);
      }, function (e) {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `can not call with package`);
        return true;
      });
    });

    it('call $pkg.test() should not ok', function () {
      const $std = new Package();
      const pkg = new Package();
      pkg.libraries.set('$std', $std);
      assert.throws(function () {
        parse(`
          import $std;
          module M {
            init() {}
            function call(): void {
              $std.test();
            }
          }`, pkg);
      }, function (e) {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `test is undefined in package '$std'`);
        return true;
      });
    });

    it('call non-method should not ok', function () {
      const pkg = new Package();
      addComponent(pkg, 'model X { Y: string }', '__filename');
      assert.throws(function () {
        parse(`
          module M {
            type @id = X;
            init() {}
            function call(): void {
              @id.Y();
            }
          }`, pkg);
      }, function (e) {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `can not call with non-method`);
        return true;
      });
    });
  });

  describe('module property', function () {
    it('assign to vid should ok', function () {
      parse(`
        module M {
          type @test = string;
          init();
          function call(): void {
            @test = 'hello world';
          }
        }`);
    });

    it('assign to vid(defined in super module) should ok', function () {
      const $std = new Package();
      addComponent($std, `
        module X {
          type @test = string;
          init() {}
        }`,'__filename');
      const pkg = new Package();
      pkg.libraries.set('$std', $std);
      parse(`
      import $std;
      module Y extends $std.X {
        init() {
          super();
          @test = 'hello world';
        }
      }`, pkg);
    });

    it('assign to vid(defined in super-super module) should ok', function () {
      const $std = new Package();
      addComponent($std, `
        module X {
          type @test = string;
          init() {}
        }`,'__filename');
      addComponent($std, `
        module Y extends X {
          init() {}
        }`,'__filename');
      const pkg = new Package();
      pkg.libraries.set('$std', $std);
      parse(`
      import $std;
      module Z extends $std.Y {
        init() {
          super();
          @test = 'hello world';
        }
      }`, pkg);
    });
  });

  describe('use extern package', function () {
    describe('call with extern package', function () {
      it('call with undefined pkg should not ok', function () {
        assert.throws(function () {
          const pkg = new Package();
          parse(`
            import $std;
            module M {
              init();
              function call(): void {
                $std.M1.test();
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the package '$std' not defined in Darafile`);
          return true;
        });
      });

      it('call with un-imported pkg should not ok', function () {
        assert.throws(function () {
          parse(`
            module M {
              init();
              function call(): void {
                $std.M1.test();
              }
            }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the package '$std' is un-imported`);
          return true;
        });
      });

      it('call with undefined module should not ok', function () {
        const std = new Package();

        assert.throws(function () {
          const pkg = new Package();
          pkg.libraries.set('$std', std);
          parse(`
            import $std;
              module M {
              init();
              function call(): void {
                $std.M1.test();
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `M1 is undefined in package '$std'`);
          return true;
        });
      });

      it('call with model should not ok', function () {
        const std = new Package();
        addComponent(std, `model M1 {}`, '__filename');
        assert.throws(function () {
          const pkg = new Package();
          pkg.libraries.set('$std', std);
          parse(`
            import $std;
            module M {
              init();
              function call(): void {
                $std.M1.test();
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `M1 is not a module`);
          return true;
        });
      });

      it('call undefined method should not ok', function () {
        const std = new Package();
        addComponent(std, `module M1 {}`, '__filename');

        assert.throws(function () {
          const pkg = new Package();
          pkg.libraries.set('$std', std);
          parse(`
            import $std;
            module M {
              init();
              function call(): void {
                $std.M1.test();
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the method 'test' is undefined in module '$std.M1'`);
          return true;
        });
      });

      it('call non-static method should not ok', function () {
        const std = new Package();
        addComponent(std, `
          module M1 {
            init() {}
            function test(): void {}
          }`, '__filename');

        assert.throws(function () {
          const pkg = new Package();
          pkg.libraries.set('$std', std);
          parse(`
            import $std;
            module M {
              init();
              function call(): void {
                $std.M1.test();
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `'$std.M1.test' is not static method`);
          return true;
        });
      });

      it('call static method with mismatch types should not ok', function () {
        const std = new Package();
        addComponent(std, `
          module M1 {
            init() {}
            function test(): void {}
          }`, '__filename');

        assert.throws(function () {
          const pkg = new Package();
          pkg.libraries.set('$std', std);
          parse(`
            import $std;
            module M {
              init();
              function call(): void {
                $std.M1.test(123);
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `'$std.M1.test' is not static method`);
          return true;
        });
      });

      it('call static method should ok', function () {
        const std = new Package();
        addComponent(std, `
          module M1 {
            init() {}
            static function test(): void {}
          }`, '__filename');

        const pkg = new Package();
        pkg.libraries.set('$std', std);
        parse(`
          import $std;
          module M {
            init();
            function call(): void {
              $std.M1.test();
            }
          }`, pkg);
      });
    });

    describe('construct extern module', function () {
      it('construct undefined pkg should not ok', function () {
        assert.throws(function () {
          parse(`
            import $std;
            module M {
              init() {}
              function call(): void {
                new $std.Module();
              }
            }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the package '$std' not defined in Darafile`);
          return true;
        });
      });

      it('construct un-imported pkg should not ok', function () {
        assert.throws(function () {
          parse(`
            module M {
            init() {}
            function call(): void {
              new $std.Module();
            }
          }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the package '$std' is un-imported`);
          return true;
        });
      });

      it('construct undefined module should not ok', function () {
        const $std = new Package();
        assert.throws(function () {
          const pkg = new Package();
          pkg.libraries.set('$std', $std);
          parse(`
            import $std;
            module M {
            init() {}
            function call(): void {
              new $std.Module();
            }
          }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `'Module' is undefined in '$std'`);
          return true;
        });
      });

      it('construct extern model should not ok', function () {
        const $std = new Package();
        addComponent($std, `model Model {}`, '__filename');
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        assert.throws(function () {
          parse(`
            import $std;
            module M {
            init() {}
            function call(): void {
              new $std.Model('hello');
            }
          }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `'$std.Model' is not a module`);
          return true;
        });
      });

      it('construct extern module without init should not ok', function () {
        const $std = new Package();
        addComponent($std, `module Module {}`, '__filename');
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        assert.throws(function () {
          parse(`
            import $std;
            module M {
            init() {}
            function call(): void {
              new $std.Module('hello');
            }
          }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the module '$std.Module' has no init`);
          return true;
        });
      });

      it('construct extern module with mismatch types should not ok', function () {
        const $std = new Package();
        addComponent($std, `module Module { init(ok: boolean) {} }`, '__filename');
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        assert.throws(function () {
          parse(`
            import $std;
            module M {
              init() {}
              function call(): void {
                new $std.Module('hello');
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the parameter types are mismatched. expected new $std.Module(boolean), but new $std.Module(string)`);
          return true;
        });
      });

      it('construct extern module should ok', function () {
        const $std = new Package();
        addComponent($std, `module Module { init() {} }`, '__filename');
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        parse(`
          import $std;
          module M {
          init() {}
          function call(): void {
            new $std.Module();
          }
        }`, pkg);
      });
    });

    describe('call extern module method', function () {
      it('undefined method should not ok', function () {
        const $std = new Package();
        addComponent($std, `module Module { init() {} }`, '__filename');
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        assert.throws(function () {
          parse(`
            import $std;
            module M {
            init() {}
            function call(): void {
              var m = new $std.Module();
              m.create('name');
            }
          }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the method 'create' is undefined in module '$std.Module'`);
          return true;
        });
      });

      it('static method should not ok', function () {
        const $std = new Package();
        addComponent($std, `
          module Module {
          init() {}
          static function create(): void {
          }
        }`, '__filename');
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        assert.throws(function () {
          parse(`
            import $std;
            module M {
            init() {}
            function call(): void {
              var m = new $std.Module();
              m.create('name');
            }
          }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `'$std.Module.create' is static method`);
          return true;
        });
      });

      it('mismatch types should not ok', function () {
        const $std = new Package();
        addComponent($std, `
          module Module {
            init() {}
            function create(b: boolean): void {
            }
          }
        `, '__filename');
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        assert.throws(function () {
          parse(`
            import $std;
            module M {
              init() {}
              function call(): void {
                var m = new $std.Module();
                m.create('name');
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the parameter types are mismatched. expected m.create(boolean), but m.create(string)`);
          return true;
        });
      });
    });

    describe('super with extern module', function () {
      it('mismatch types should not ok', function () {
        const $std = new Package();
        addComponent($std, `module Module { init() {} }`, '__filename');
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        assert.throws(function () {
          parse(`
            import $std;
            module M extends $std.Module {
              init() {
                super('hello', 'world!');
              }
            }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the parameter types are mismatched. expected $std.Module(), but $std.Module(string, string)`);
          return true;
        });
      });

      it('super with extern module should ok', function () {
        const $std = new Package();
        addComponent($std, `module Module { init() {} }`, '__filename');
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        parse(`
          import $std;
          module M extends $std.Module {
            init() {
              super();
            }
          }`, pkg);
      });
    });

    describe('construct extern model', function () {
      it('construct undefined pkg should not ok', function () {
        assert.throws(function () {
          parse(`
            import $std;
            module M {
              init() {}
              function call(): void {
                new $std.Model{};
              }
            }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the package '$std' not defined in Darafile`);
          return true;
        });
      });

      it('construct un-imported pkg should not ok', function () {
        assert.throws(function () {
          parse(`
            module M {
            init() {}
            function call(): void {
              new $std.Model{};
            }
          }`);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the package '$std' is un-imported`);
          return true;
        });
      });

      it('construct undefined model should not ok', function () {
        const $std = new Package();
        assert.throws(function () {
          const pkg = new Package();
          pkg.libraries.set('$std', $std);
          parse(`
            import $std;
            module M {
            init() {}
            function call(): void {
              new $std.Model{};
            }
          }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `'Model' is undefined in '$std'`);
          return true;
        });
      });

      it('construct extern model should not ok', function () {
        const $std = new Package();
        addComponent($std, `module Model {}`, '__filename');
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        assert.throws(function () {
          parse(`
            import $std;
            module M {
            init() {}
            function call(): void {
              new $std.Model{};
            }
          }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `'$std.Model' is not a model`);
          return true;
        });
      });

      it('construct extern model with mismatch types should not ok', function () {
        const $std = new Package();
        addComponent($std, `model Model {}`, '__filename');
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        assert.throws(function () {
          parse(`
            import $std;
            module M {
            init() {}
            function call(): void {
              new $std.Model{
                x = ''
              };
            }
          }`, pkg);
        }, function (e) {
          assert.ok(e instanceof SyntaxError);
          assert.deepStrictEqual(e.message, `the field 'x' is undefined in model '$std.Model'`);
          return true;
        });
      });

      it('construct extern model should ok', function () {
        const $std = new Package();
        addComponent($std, `model Model {}`, '__filename');
        const pkg = new Package();
        pkg.libraries.set('$std', $std);
        parse(`
          import $std;
          module M {
            init() {}
            function call(): void {
              new $std.Model{};
            }
          }`, pkg);
      });
    });
  });

  describe('no return check', function () {
    it('void should ok', function () {
      parse(`
        module M {
        init();
        function call(): void {
        }
      }`);
    });

    it('non-void should not ok', function () {
      assert.throws(() => {
        parse(`
          module M {
          init();
          function call(): string {
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'no return statement');
        return true;
      });

      assert.throws(() => {
        parse(`
          module M {
          init();
          function call(): string {
            '123';
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'no return statement');
        return true;
      });
    });

    it('check with branch should ok', function () {
      assert.throws(() => {
        parse(`
          module M {
          init();
          function call(): string {
            if (true) {

            }
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'no return statement');
        return true;
      });

      assert.throws(() => {
        parse(`
          module M {
          init();
          function call(): string {
            if (true) {
              return '';
            }
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'no return statement');
        return true;
      });

      assert.throws(() => {
        parse(`
          module M {
          init();
          function call(): string {
            if (true) {
              return '';
            } else {

            }
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'no return statement');
        return true;
      });

      parse(`
        module M {
        init();
        function call(): string {
          if (true) {
            return '';
          } else {
            return 'b';
          }
        }
      }`);
    });

    it('throws should ok', function () {
      parse(`
        module M {
        init();
        function call(): string {
          throw {
            'message' = 'hello'
          };
        }
      }`);
    });
  });

  describe('unreachable check', function () {
    it('unreachable code should not ok', function () {
      assert.throws(() => {
        parse(`
          module M {
          init();
          function call(): void {
            return;
            true;
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'unreachable code');
        return true;
      });
    });

    it('unreachable code with branches should not ok', function () {
      assert.throws(() => {
        parse(`
          module M {
          init();
          function call(): void {
            if (true) {
              return;
            } else {
              return;
            }
            true;
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'unreachable code');
        return true;
      });

      parse(`
      module M {
      init();
      function call(): void {
        if (true) {
          return;
        } else {
        }
        true;
      }
    }`);
    });
  });

  describe('unused variable check', function () {
    it('unused variable should not ok', function () {
      assert.throws(() => {
        parse(`
        module M {
        init();
        function call(): void {
          var x = 1;
        }
      }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, `unused variable 'x'`);
        return true;
      });
    });

    it('used variable with map should ok', function () {
      parse(`
        module M {
        init();
        function call(): void {
          var x = {};
          var y = 'a';
          x[y];
        }
      }`);
    });
  });

  describe('super call check', function () {
    it('no super call should not ok', function () {
      assert.throws(() => {
        const pkg = new Package();
        addComponent(pkg, 'module X {}', '__filename');
        parse(`
          module M extends X {
            init() {
            }
          }`, pkg);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, `must contain 'super' call`);
        return true;
      });
    });

    it('super call should ok', function () {
      const pkg = new Package();
      addComponent(pkg, 'module X { init() {} }', '__filename');
      parse(`
        module M extends X {
          init() {
            super();
          }
        }`, pkg);
    });

    it('access property before super call should not ok', function () {
      const pkg = new Package();
      addComponent(pkg, 'module X { init() {} }', '__filename');
      assert.throws(() => {
        parse(`
          module M extends X {
            type @id = string;
            init() {
              @id = 'hello';
              super();
            }
          }`, pkg);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, `'super' must be called before accessing property`);
        return true;
      });
    });

    it('access property after super call should ok', function () {
      const pkg = new Package();
      addComponent(pkg, 'module X { init() {} }', '__filename');
      parse(`
        module M extends X {
          type @id = string;
          init() {
            super();
            @id = 'hello';
          }
        }`, pkg);
    });
  });
});
