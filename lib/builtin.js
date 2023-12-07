'use strict';

const { Tag } = require('./tag');
const Lexer = require('./lexer');
const Parser = require('./parser');
const fs = require('fs');
const path = require('path');

function _module(name) {
  const filePath = path.join(__dirname, '../builtin', `${name}.dara`);
  const source = fs.readFileSync(filePath, 'utf-8');
  const lexer = new Lexer(source, filePath);
  const parser = new Parser(lexer);
  const ast = parser.program();
  return ast;
}

function _model(name, fields) {
  return {
    type: 'model',
    modelName: {
      tag: Tag.ID,
      lexeme: name
    },
    modelBody: {
      type: 'modelBody',
      nodes: fields
    }
  };
}

function _field(name, type, required = false) {
  return {
    'attrs': [],
    'fieldName': {
      'lexeme': name,
      'tag': Tag.ID,
    },
    'fieldValue': {
      'fieldType': type,
      'type': 'fieldType'
    },
    'required': required,
    'type': 'modelField'
  };
}

function _mapfield(name, keyType, valueType, required = false) {
  return {
    'attrs': [],
    'fieldName': {
      'lexeme': name,
      'tag': Tag.ID,
    },
    'fieldValue': {
      'fieldType': 'map',
      'type': 'fieldType',
      'keyType': {
        'lexeme': keyType,
        'tag': Tag.TYPE
      },
      'valueType': {
        'lexeme': valueType,
        'tag': Tag.TYPE
      }
    },
    'required': required,
    'type': 'modelField'
  };
}

const builtin = new Map();
// built-in types, starts with $
builtin.set('$Model', _model('$Model', []));
builtin.set('$Response', _model('$Response', [
  _field('statusCode', 'number', true),
  _field('statusMessage', 'string', true),
  _mapfield('headers', 'string', 'string', true),
  _field('body', 'readable')
]));
builtin.set('$Request', _model('$Request', [
  _field('protocol', 'string'),
  _field('port', 'number'),
  _field('method', 'string', true),
  _field('pathname', 'string', true),
  _mapfield('query', 'string', 'string'),
  _mapfield('headers', 'string', 'string'),
  _field('body', 'readable')
]));
builtin.set('$Error', _model('$Error', [
  _field('name', 'string'),
  _field('message', 'string'),
  _field('code', 'string'),
  _field('stack', 'string')
]));

builtin.set('$URL', _module('url'));

builtin.set('$File', _module('file'));

builtin.set('$JSON', _module('json'));

builtin.set('$Form', _module('form'));

builtin.set('$Logger', _module('logger'));

builtin.set('$XML', _module('xml'));

builtin.set('$Env', _module('env'));

// TODO
//builtin.set('Crypto', _module('crypto'));

builtin.set('$Stream', _module('stream'));

builtin.set('$Date', _module('date'));

builtin.set('$String', _module('string'));

builtin.set('$Array', _module('array'));

builtin.set('$Bytes', _module('bytes'));

builtin.set('$Entry', _module('entry'));

builtin.set('$Map', _module('map'));

builtin.set('$Number', _module('number'));

module.exports = builtin;
