'use strict';

exports.Tag = Object.freeze({
  STRING: 1, // String literal
  ID: 2,
  VID: 3, // @ID
  CONST: 4,
  MODEL: 5, // model
  MODULE: 6, // module
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
  PACK_ID: 21, // $ID, used for packageid
  IMPORT: 22, // import
  NEW: 23, // new
  INTERFACE: 24, // interface
  STATIC: 25, // static
  LOGICAL: 26, // &&, ||
  OPERATOR: 27, // <, <=, >, >=
  TRY: 28,  // try
  CATCH: 29, // catch
  FINALLY: 30, // finally
  WHILE: 31,  // while
  FOR: 32,    // for
  BREAK: 33,  // break
  TO: 34,  // to
  IMPLEMENTS: 35, // implements
  INLINE_ID: 36, // #id
  OF: 37, // of
  AS: 38, // as
});

var TagTip = {};

Object.keys(exports.Tag).forEach((key) => {
  var value = exports.Tag[key];
  TagTip[value] = key;
});

exports.tip = function (tag) {
  return TagTip[tag] || tag;
};
