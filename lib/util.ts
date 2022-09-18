import * as fs from "fs";
import * as path from "path";

export function isBasicType(type: string): boolean {
	const basicType = [
		'void', 'string', 'number', 'integer',
		'int8', 'int16', 'int32', 'int64',
		'long', 'ulong', 'uint8', 'uint16',
		'uint32', 'uint64', 'float', 'double',
		'boolean', 'bytes', 'any', 'map',
		'object', 'writable', 'readable'
	];
	return basicType.indexOf(type) !== -1;
}

export function isNumber(type: string): boolean {
	const numberType = [
		'number', 'integer', 'int8', 'int16',
		'int32', 'int64', 'long', 'ulong',
		'uint8', 'uint16', 'uint32',
		'uint64', 'float', 'double'
	];
	return numberType.indexOf(type) !== -1;
};

export function isInteger(type: string): boolean {
	const integerType = [
		'integer', 'int8', 'int16',
		'int32', 'int64', 'uint8',
		'uint16', 'uint32', 'uint64'
	];
	return integerType.indexOf(type) !== -1;
};

export function getDarafile(dir: string): string {
	return fs.existsSync(path.join(dir, 'Teafile')) ? path.join(dir, 'Teafile') : path.join(dir, 'Darafile');
};
