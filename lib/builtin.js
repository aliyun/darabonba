'use strict';

const { Tag } = require('./tag');
const Lexer = require('./lexer');
const Parser = require('./parser');
const fs = require('fs');
const path = require('path');


function _function(name, returnType, params) {
  return {
    'type': 'function',
    'isStatic': false,
    'isAsync': false,
    'hasThrow': false,
    'functionName': {
      'tag': 2,
      'lexeme': name,
    },
    'params': {
      'type': 'params',
      'params': params
    },
    'returnType': {
      'tag': 8,
      'lexeme': returnType,
    },
    'functionBody': null,
  };
}

function _param(name, type) {
  return {
    'type': 'param',
    'paramName': {
      'tag': 2,
      'lexeme': name
    },
    'paramType': {
      'tag': 8,
      'lexeme': type,
    },
  };
}

function _module(name) {
  const filePath = path.join(__dirname, '../builtin', `${name}.dara`);
  const source = fs.readFileSync(filePath, 'utf-8');
  const lexer = new Lexer(source, filePath);
  const parser = new Parser(lexer);
  const ast = parser.program();
  return ast;
}

function _model(name, fields, extend) {
  const extendOn = extend ? {
    lexeme: extend,
    tag: 2,
    idType: 'builtin_model'
  } : undefined;
  return {
    type: 'model',
    extendOn,
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

builtin.set('$SSEEvent', _model('$SSEEvent', [
  _field('id', 'string'),
  _field('event', 'string'),
  _field('data', 'string'),
  _field('retry', 'integer')
]));

builtin.set('$Error', _model('$Error', [
  _field('name', 'string'),
  _field('message', 'string'),
  _field('code', 'string'),
  _field('stack', 'string')
]));

builtin.set('$RetryOptions', _model('$RetryOptions', [
  _field('retryable', 'boolean'),
]));

builtin.set('$ExtendsParameters', _model('$ExtendsParameters', [
  _mapfield('headers', 'string', 'string'),
  _mapfield('queries', 'string', 'string'),
]));

builtin.set('$RuntimeOptions', _model('$RuntimeOptions', [
  _field('retryOptions',  {
    'tag': 2,
    'lexeme': '$RetryOptions',
    'idType': 'model'
  }),
  _field('autoretry', 'boolean'),
  _field('ignoreSSL', 'boolean'),
  _field('key', 'string'),
  _field('cert', 'string'),
  _field('ca', 'string'),
  _field('maxAttempts', 'number'),
  _field('backoffPolicy', 'string'),
  _field('backoffPeriod', 'number'),
  _field('readTimeout', 'number'),
  _field('connectTimeout', 'number'),
  _field('httpProxy', 'string'),
  _field('httpsProxy', 'string'),
  _field('noProxy', 'string'),
  _field('socks5Proxy', 'string'),
  _field('socks5NetWork', 'string'),
  _field('maxIdleConns', 'number'),
  _field('keepAlive', 'boolean'),
  _field('extendsParameters', {
    'tag': 2,
    'lexeme': '$ExtendsParameters',
    'idType': 'model'
  }),
]));

builtin.set('$ResponseError', _model('$ResponseError', [
  _field('statusCode', 'number'),
  _field('retryAfter', 'number'),
], '$Error'));

builtin.set('$FileField', _model('$FileField', [
  _field('filename', 'string'),
  _field('contentType', 'string'),
  _field('content', 'readable'),
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

builtin.set('$ModelInstance', _module('model'));

builtin.set('$Stream', _module('stream'));

builtin.set('$Date', _module('date'));

builtin.set('$String', _module('string'));

builtin.set('$Array', _module('array'));

builtin.set('$Bytes', _module('bytes'));

builtin.set('$Entry', _module('entry'));

builtin.set('$Map', _module('map'));

builtin.set('$Number', _module('number'));

[
  'string', 'number', 'integer',
  'int8', 'int16', 'int32', 'int64',
  'long', 'ulong', 'uint8', 'uint16',
  'uint32', 'uint64', 'float', 'double',
  'boolean', 'bytes', 'any','object',
  'writable', 'readable'
].map(type => {
  const name = `$${type}`;
  builtin.set(name, _function(name, type, [_param('data', 'any')]));
});

builtin.set('$isNull', _function('$isNull', 'boolean', [_param('data', 'any')]));

builtin.set('$sleep', _function('$sleep', 'void', [_param('timeLong', 'integer')]));

builtin.set('$default', _function('$default', 'any', [_param('variable', 'any'), _param('defaultVal', 'any')]));

builtin.set('$equal', _function('$equal', 'boolean', [_param('data', 'any'), _param('eqlData', 'any')]));

builtin.set('$kernelInfo', _function('$kernelInfo', 'map[string]string', []));

module.exports = builtin;
