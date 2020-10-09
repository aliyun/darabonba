'use strict';
const assert = require('assert');

const Analyser = require('../lib/main_analyser');
const Parser = require('../lib/parser');
const Lexer = require('../lib/lexer');
const Package = require('../lib/package');

function parse(source, pkg = new Package()) {
  const lexer = new Lexer(source, '__filename');
  const parser = new Parser(lexer);
  const ast = parser.program();
  const anlyser = new Analyser({ source, filename: '__filename' }, pkg);
  anlyser.check(ast);
  anlyser.checkMethods(ast);
  return ast;
}

describe('main analyser', function () {
  describe('import', function () {
    it('import undefined package should not ok', function () {
      assert.throws(() => {
        parse(`import $std; main {}`);
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
        parse(`import $std; import $std; main {}`, pkg);
      }, (e) => {
        assert.ok(e instanceof SyntaxError);
        assert.deepStrictEqual(e.message, `the package id '$std' has been imported`);
        return true;
      });
    });
  });

  describe('define methods', function () {
    it('redefine function should not ok', function () {
      assert.throws(() => {
        parse(`
          main {
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

    it('define function should ok', function () {
      parse(`
        main {
          function getId(): string {
            return '';
          }
        }`);
    });
  });

  describe('main', function () {
    it('main should ok', function () {
      parse(`
      main {
        main(args: [string]) {

        }
      }`);
    });

    it('too many entries should not ok', function () {
      assert.throws(() => {
        parse(`
        main {
          main(args: [string]) {
          }

          main(args: [string]) {
          }
        }`);
      }, (ex) => {
        assert.ok(ex instanceof SyntaxError);
        assert.deepStrictEqual(ex.message, 'only one entry is allowed');
        return true;
      });
    });
  });
});
