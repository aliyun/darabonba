'use strict';

exports.Tag = Object.freeze({
  STRING: 1, // String literal
  ID: 2,
  VID: 3, // @ID
  CONST: 4,
  MODEL: 5,
  EXTENDS: 7, // extends
  TYPE: 8, // string/number/bytes
  NUMBER: 9, // Number literal
  SUPER: 10, // super
  VAR: 11, // var
  TEMPLATE: 12, // tempalte
  BOOL: 13, // true/false
  NULL: 14, // null
  RETURN: 15, //return
  THROW: 16, //throw
  IF: 17, // if
  ELSE: 18, // else
  ANNOTATION: 19, //annotation
  COMMENT: 20, // comments
  IMPORT: 22, // import
  NEW: 23, // new
  RPC: 24, // rpc
  STATIC: 25, // static
  AND: 26,  // &&
  OR: 27,   // ||
  TRY: 28,  // try
  CATCH: 29, // catch
  FINALLY: 30, // finally
  WHILE: 31,  // while
  FOR: 32,    // for
  BREAK: 33,  // break
  YIELD: 34, // yield
  INCREMENT: 35, // ++
  DECREMENT: 36, // --
  EQ: 37, // ==
  NEQ: 38, // !=
  GT: 39, // >
  GTE: 40, // >=
  LT: 41, // <
  LTE: 42, // <=
  NOTE: 43, // @ID()
});

var TagTip = {};

Object.keys(exports.Tag).forEach((key) => {
  var value = exports.Tag[key];
  TagTip[value] = key;
});

exports.tip = function (tag) {
  return TagTip[tag] || tag;
};
