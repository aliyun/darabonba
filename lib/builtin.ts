import { Tag } from './tag.js';

function _model(name: string, fields: { attrs: any[]; fieldName: { lexeme: any; tag: Tag; }; fieldValue: { fieldType: any; type: string; }; required: boolean; type: string; }[]) {
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

function _field(name: string, type: string, required = false) {
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

function _mapfield(name: string, keyType: string, valueType: string, required = false) {
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

export const builtin = new Map<string, any>();
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
