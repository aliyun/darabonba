'use strict';

const expect = require('expect.js');
const fs = require('fs');
const path = require('path');
const noteUtil = require('../lib/note');
const { parse } = require('..');

function readAndParse(specPath) {
  const filePath = path.join(__dirname, specPath);
  return parse(fs.readFileSync(filePath, 'utf-8'), filePath);
}

function pos(line, column) {
  return { line, column };
}

function loc(startLine, startColumn, endLine, endColumn) {
  return {
    start: pos(startLine, startColumn),
    end: pos(endLine, endColumn)
  };
}

describe('note util', function () {
  let notes = {};
  let nodes = [];

  before(function () {
    let ast = readAndParse('fixtures/notes/main.dara');
    notes = ast.notes;
    nodes = ast.moduleBody.nodes;
  });

  it('get model front note should be ok', function () {
    expect(noteUtil.getNotes(notes, 0, nodes[0].tokenRange[0])).to.eql([
      {
        'type': 'note',
        'note': {
          'index': 8,
          'lexeme': '@input',
          'loc': loc(5, 1, 5, 7),
          'tag': 43
        },
        'arg': {
          'type': 'string',
          'value': {
            'tag': 1,
            'loc': loc(5, 9, 5, 13),
            'string': 'call',
            'index': 10
          },
          'loc': loc(5, 9, 5, 13),
          'tokenRange': [
            10,
            11
          ]
        },
        'loc': loc(5, 1, 6, 6),
        'tokenRange': [
          8,
          12
        ]
      }
    ]);

    expect(noteUtil.getNotes(notes, nodes[0].tokenRange[1], nodes[1].tokenRange[0])).to.eql([
      {
        'type': 'note',
        'note': {
          'index': 25,
          'lexeme': '@output',
          'loc': loc(10, 1, 10, 8),
          'tag': 43
        },
        'arg': {
          'type': 'string',
          'value': {
            'tag': 1,
            'loc': loc(10, 10, 10, 14),
            'string': 'call',
            'index': 27
          },
          'loc': loc(10, 10, 10, 14),
          'tokenRange': [
            27,
            28
          ]
        },
        'loc': loc(10, 1, 11, 6),
        'tokenRange': [
          25,
          29
        ]
      }
    ]);
  });

  it('get function front notes should be ok', function () {
    expect(noteUtil.getNotes(notes, nodes[2].tokenRange[1], nodes[3].tokenRange[0])).to.eql([
      {
        'type': 'note',
        'note': {
          'tag': 43,
          'loc': loc(17, 1, 17, 7),
          'lexeme': '@error',
          'index': 42
        },
        'arg': {
          'type': 'array',
          'items': [
            {
              'type': 'property_access',
              'id': {
                'tag': 2,
                'loc': loc(17, 9, 17, 13),
                'lexeme': 'Util',
                'index': 45
              },
              'propertyPath': [
                {
                  'tag': 2,
                  'loc': loc(17, 14, 17, 27),
                  'lexeme': 'MainFileError',
                  'index': 47
                }
              ],
              'loc':loc(17, 9, 17, 27),
              'tokenRange': [
                45,
                48
              ]
            },
            {
              'type': 'property_access',
              'id': {
                'tag': 2,
                'loc': loc(17, 29, 17, 33),
                'lexeme': 'Util',
                'index': 49
              },
              'propertyPath': [
                {
                  'tag': 2,
                  'loc': loc(17, 34, 17, 49),
                  'lexeme': 'ExtendFileError',
                  'index': 51
                }
              ],
              'loc': loc(17, 29, 17, 49),
              'tokenRange': [
                49,
                52
              ]
            },
            {
              'type': 'property_access',
              'id': {
                'tag': 2,
                'loc': loc(17, 51, 17, 55),
                'lexeme': 'Util',
                'index': 53
              },
              'propertyPath': [
                {
                  'tag': 2,
                  'loc': loc(17, 56, 17, 74),
                  'lexeme': 'ExtendSubFileError',
                  'index': 55
                }
              ],
              'loc': loc(17, 51, 17, 74),
              'tokenRange': [
                53,
                56
              ]
            }
          ],
          'tokenRange': [
            44,
            57
          ]
        },
        'loc': loc(17, 1, 26, 7),
        'tokenRange': [
          42,
          89
        ]
      },
      {
        'type': 'note',
        'note': {
          'tag': 43,
          'loc': loc(18, 1, 18, 12),
          'lexeme': '@returnMode',
          'index': 58
        },
        'arg': {
          'type': 'object',
          'fields': [
            {
              'type': 'objectField',
              'fieldName': {
                'tag': 2,
                'loc': loc(19, 3, 19, 12),
                'lexeme': 'aliasName',
                'index': 61
              },
              'expr': {
                'type': 'string',
                'value': {
                  'tag': 1,
                  'loc': loc(19, 16, 19, 29),
                  'string': 'execTaskAsync',
                  'index': 63
                },
                'loc': loc(19, 16, 19, 29),
                'tokenRange': [
                  63,
                  64
                ]
              },
              'tokenRange': [
                61,
                64
              ]
            },
            {
              'type': 'objectField',
              'fieldName': {
                'tag': 2,
                'loc': loc(20, 3, 20, 8),
                'lexeme': 'async',
                'index': 65
              },
              'expr': {
                'type': 'boolean',
                'value': true,
                'loc': loc(20, 11, 20, 15),
                'tokenRange': [
                  67,
                  68
                ]
              },
              'tokenRange': [
                65,
                68
              ]
            },
            {
              'type': 'objectField',
              'fieldName': {
                'tag': 2,
                'loc': loc(21, 3, 21, 11),
                'lexeme': 'callback',
                'index': 69
              },
              'expr': {
                'type': 'variable',
                'id': {
                  'tag': 2,
                  'loc': loc(21, 14, 21, 22),
                  'lexeme': 'callback',
                  'index': 71
                },
                'loc': loc(21, 14, 21, 22),
                'tokenRange': [
                  71,
                  72
                ]
              },
              'tokenRange': [
                69,
                72
              ]
            },
            {
              'type': 'objectField',
              'fieldName': {
                'tag': 2,
                'loc': loc(22, 3, 22, 11),
                'lexeme': 'interval',
                'index': 73
              },
              'expr': {
                'type': 'number',
                'value': {
                  'tag': 9,
                  'loc': loc(22, 13, 22, 14),
                  'value': 3,
                  'type': 'integer',
                  'index': 75
                },
                'loc': loc(22, 13, 22, 14),
                'tokenRange': [
                  75,
                  76
                ]
              },
              'tokenRange': [
                73,
                76
              ]
            },
            {
              'type': 'objectField',
              'fieldName': {
                'tag': 2,
                'loc': loc(23, 3, 23, 8),
                'lexeme': 'times',
                'index': 77
              },
              'expr': {
                'type': 'number',
                'value': {
                  'tag': 9,
                  'loc': loc(23, 11, 23, 13),
                  'value': 10,
                  'type': 'integer',
                  'index': 79
                },
                'loc': loc(23, 11, 23, 13),
                'tokenRange': [
                  79,
                  80
                ]
              },
              'tokenRange': [
                77,
                80
              ]
            },
            {
              'type': 'objectField',
              'fieldName': {
                'tag': 2,
                'loc': loc(24, 3, 24, 8),
                'lexeme': 'input',
                'index': 81
              },
              'expr': {
                'type': 'property_access',
                'id': {
                  'tag': 2,
                  'loc': loc(24, 11, 24, 15),
                  'lexeme': 'data',
                  'index': 83
                },
                'propertyPath': [
                  {
                    'tag': 2,
                    'loc': loc(24, 16, 24, 20),
                    'lexeme': 'size',
                    'index': 85
                  }
                ],
                'loc': loc(24, 11, 24, 20),
                'tokenRange': [
                  83,
                  86
                ]
              },
              'tokenRange': [
                81,
                86
              ]
            }
          ],
          'loc': loc(18, 13, 25, 2),
          'tokenRange': [
            60,
            88
          ]
        },
        'loc': loc(18, 1, 26, 7),
        'tokenRange': [
          58,
          89
        ]
      }
    ]);
  });

  it('get notes in funtion body should be', function () {
    expect(noteUtil.getNotes(notes, nodes[3].tokenRange[0], nodes[3].tokenRange[1])).to.eql([
      {
        'type': 'note',
        'note': {
          'tag': 43,
          'loc': loc(27, 3, 27, 6),
          'lexeme': '@go',
          'index': 100
        },
        'arg': {
          'type': 'string',
          'value': {
            'tag': 1,
            'loc': loc(27, 8, 27, 30),
            'string': 'fmt.printv("%v", data)',
            'index': 102
          },
          'loc': loc(27, 8, 27, 30),
          'tokenRange': [
            102,
            103
          ]
        },
        'loc': loc(27, 3, 28, 5),
        'tokenRange': [
          100,
          104
        ]
      }
    ]);
  });
});
