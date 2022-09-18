'use strict';
import fs from 'fs';
import path from 'path';

export const isBasicType = function (type){
  const basicType = [
    'void', 'string', 'number', 'integer',
    'int8', 'int16', 'int32', 'int64',
    'long', 'ulong', 'uint8', 'uint16',
    'uint32', 'uint64', 'float', 'double',
    'boolean', 'bytes', 'any', 'map',
    'object', 'writable', 'readable'
  ];
  return basicType.indexOf(type) !== -1;
};

export const isNumber = function (type) {
  const numberType = [
    'number', 'integer', 'int8', 'int16',
    'int32', 'int64', 'long', 'ulong',
    'uint8', 'uint16', 'uint32',
    'uint64', 'float', 'double'
  ];
  return numberType.indexOf(type) !== -1;
};

export const isInteger = function (type) {
  const integerType = [
    'integer', 'int8', 'int16',
    'int32', 'int64', 'uint8',
    'uint16', 'uint32', 'uint64'
  ];
  return integerType.indexOf(type) !== -1;
};

export const getDarafile = function (dir) {
  return fs.existsSync(path.join(dir, 'Teafile')) ? path.join(dir, 'Teafile') : path.join(dir, 'Darafile');
};