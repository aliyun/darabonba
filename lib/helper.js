'use strict';

export function isLetter(c) {
  if (typeof c !== 'string') {
    return false;
  }
  // letter = "A" … "Z" | "a" … "z"
  var code = c.charCodeAt(0);
  return (code >= 0x41 && code <= 0x5a ||
    code >= 0x61 && code <= 0x7a);
}

export function isDecimalDigit(c) {
  if (typeof c !== 'string') {
    return false;
  }
  // decimalDigit = "0" … "9"
  var code = c.charCodeAt(0);
  return code >= 0x30 && code <= 0x39;
}