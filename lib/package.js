'use strict';

const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const exists = util.promisify(require('fs').exists);

const stripComments = require('strip-json-comments');

const Lexer = require('./lexer');
const Parser = require('./parser');

const ModuleAnalyser = require('./module_analyser');
const ModelAnalyser = require('./model_analyser');
const MainAnalyser = require('./main_analyser');
const InterfaceAnalyser = require('./interface_analyser');

class Package {
  constructor(pkgDir) {
    this.pkgDir = pkgDir;
    this.pkgInfo = {};
    this.components = new Map();
    this.libraries = new Map();
    this.main = null;
  }

  error(message, filename, source, token) {
    if (token) {
      const loc = token.loc;
      console.error(`${filename}:${loc.start.line}:${loc.start.column}`);
      console.error(`${source.split('\n')[loc.start.line - 1]}`);
      console.error(`${' '.repeat(loc.start.column - 1)}^`);
    }

    throw new SyntaxError(message);
  }

  async checkLibraries() {
    const libraries = this.pkgInfo.libraries || {};
    if (Object.keys(libraries).length === 0) {
      return;
    }
    // load .libraries file
    const lockFilePath = path.join(this.pkgDir, '.libraries.json');
    let mapping = {};
    if (await exists(lockFilePath)) {
      const content = await fs.readFile(lockFilePath, 'utf-8');
      mapping = JSON.parse(content);
    }

    const pkgIds = Object.keys(libraries);
    for (let i = 0; i < pkgIds.length; i++) {
      const pkgId = pkgIds[i];
      const pkgPath = libraries[pkgId];
      let lib;
      if (pkgPath.startsWith('./') || pkgPath.startsWith('../')) {
        lib = new Package(path.join(this.pkgDir, pkgPath));
      } else {
        if (!mapping[pkgPath]) {
          throw new Error(`the package(${pkgId}) has not installed, use 'dara install' first`);
        }
        lib = new Package(path.join(this.pkgDir, mapping[pkgPath]));
      }
      await lib.analyse();
      // add $ as prefix
      this.libraries.set(`$${pkgId}`, lib);
    }

    // $builtin
    const $builtin = new Package(path.join(__dirname, 'builtin'));
    await $builtin.analyse();
    this.libraries.set('$builtin', $builtin);
  }

  async checkDarafile() {
    const darafile = path.join(this.pkgDir, 'Darafile');
    const hasDarafile = await exists(darafile);
    if (!hasDarafile) {
      throw new Error(`the folder(${this.pkgDir}) is not a Darabonba package`);
    }
    const pkgContent = await fs.readFile(darafile, 'utf8');
    try {
      this.pkgInfo = JSON.parse(stripComments(pkgContent));
    } catch (ex) {
      throw new Error(`the darafile is invalid: ${darafile}`);
    }

    if (this.pkgInfo.darabonba !== '2.0') {
      throw new Error(`the darabonba version(${this.pkgInfo.darabonba}) is not support by current parser, Darafile: ${darafile}`);
    }
  }

  async parseFiles(files) {
    // checkpoint: 检查 model、module 是否重复
    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      const filePath = path.join(this.pkgDir, item);
      const source = await fs.readFile(filePath, 'utf8');
      const lexer = new Lexer(source, filePath);
      const parser = new Parser(lexer);
      const ast = parser.program();
      if (ast.type !== 'main') {
        const name = ast.name.lexeme;
        if (this.components.has(name)) {
          this.error(`redefined '${name}'`, filePath, source, ast.name);
        }
        this.components.set(name, {
          type: ast.type,
          ast,
          ctx: {
            source,
            filename: filePath
          }
        });
      } else {
        // checkpoint: 不能有多个 dmain 文件
        if (this.main) {
          throw new Error(`dmain files can not more than one`);
        }
        this.main = {
          type: ast.type,
          ast,
          ctx: {
            source,
            filename: filePath
          }
        };
      }
    }
  }

  async analyse() {
    await this.checkDarafile();
    await this.checkLibraries();
    const files = await fs.readdir(this.pkgDir);

    // parse files
    await this.parseFiles(files.filter((item) => {
      return item.endsWith('.dara');
    }));

    // pre analyse: 仅分析结构及声明
    for (const item of this.components.values()) {
      if (item.type === 'module') {
        const analyser = new ModuleAnalyser(item.ctx, this);
        item.analyser = analyser;
        analyser.check(item.ast);
      } else if (item.type === 'model') {
        const analyser = new ModelAnalyser(item.ctx, this);
        item.analyser = analyser;
        analyser.check(item.ast);
      } else if (item.type === 'interface') {
        const analyser = new InterfaceAnalyser(item.ctx, this);
        item.analyser = analyser;
        analyser.check(item.ast);
      }
    }

    // post analyse：分析方法体
    for (const item of this.components.values()) {
      if (item.type === 'module' || item.type === 'interface') {
        item.analyser.checkMethods(item.ast);
      }
    }

    if (this.main) {
      const analyser = new MainAnalyser(this.main.ctx, this);
      analyser.check(this.main.ast);
      analyser.checkMethods(this.main.ast);
      this.main.analyser = analyser;
    }
  }
}

module.exports = Package;
