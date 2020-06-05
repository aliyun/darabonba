'use strict';

const {
  analyze, getChecker
} = require('./lib/semantic');
const util = require('./lib/util');
const Tag = require('./lib/tag');
const builtin = require('./lib/builtin');
const comment = require('./lib/comment');
const pkg = require('./package.json');

function parse(source, filePath) {
  const ast = analyze(source, filePath);
  ast.parserVersion = pkg.version;
  return ast;
}

module.exports = {
  parse,
  Tag,
  util,
  builtin,
  comment,
  getChecker
};
