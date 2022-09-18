'use strict';

export {
  analyze, getChecker
} from './lib/semantic.js';
export * as util from './lib/util.js';
export { Tag } from './lib/tag.js';
export * as builtin from './lib/builtin.js';
export * as comment from './lib/comment.js';

import {
  analyze
} from './lib/semantic.js';

export function parse(source, filePath) {
  const ast = analyze(source, filePath);
  ast.parserVersion = '1.4.3';
  return ast;
}