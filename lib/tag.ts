export enum Tag {
  STRING = 1, // String literal
  ID,
  VID, // @ID
  CONST,
  MODEL,
  EXTENDS = 7, // extends
  TYPE, // string/number/bytes
  NUMBER, // Number literal
  SUPER, // super
  VAR, // var
  TEMPLATE, // tempalte
  BOOL, // true/false
  NULL, // null
  RETURN, // return
  THROW, // throw
  IF, // if
  ELSE, // else
  ANNOTATION, // annotation
  COMMENT, // comments
  IMPORT = 22, // import
  NEW, // new
  RPC, // rpc
  STATIC, // static
  AND,  // &&
  OR,   // ||
  TRY,  // try
  CATCH, // catch
  FINALLY, // finally
  WHILE,  // while
  FOR,    // for
  BREAK,  // break
}

const TagTip = new Map<number, String>();

Object.keys(Tag).forEach((key) => {
  TagTip[Tag[key]] = key;
});

export function tip(tag: string): string {
  return TagTip[tag] || tag;
}
