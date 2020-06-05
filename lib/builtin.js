'use strict';

const { Tag } = require('./tag');

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

module.exports = builtin;
