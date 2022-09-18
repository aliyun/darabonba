import { Tag } from './tag.js';
import { Loc, Token } from './skyline/token.js';

export class StringLiteral extends Token {
	constructor(public string: string, loc: { start: Loc; end: Loc; }) {
		super(Tag.STRING, loc);
	}

	toString(): string {
		return `String: ${this.string}`;
	}
}

export class NumberLiteral extends Token {
	constructor(public value: number, public type: string, loc: { start: Loc; end: Loc; }) {
		super(Tag.NUMBER, loc);
	}

	toString(): string {
		return `Number: ${this.value}`;
	}
}

export class Annotation extends Token {
	constructor(public value: string, loc: { start: Loc; end: Loc; }) {
		super(Tag.ANNOTATION, loc);
	}

	toString(): string {
		return `Annotation: ${this.value}`;
	}
}

export class Comment extends Token {
	constructor(public value: string, loc: { start: Loc; end: Loc; }) {
		super(Tag.COMMENT, loc);
	}

	toString(): string {
		return `Comment: ${this.value}`;
	}
}

export class TemplateElement extends Token {
	constructor(public string: string, public tail: boolean, loc: { start: Loc; end: Loc; }) {
		super(Tag.TEMPLATE, loc);
	}

	toString(): string {
		return `TemplateElement: \`${this.string}\``;
	}
}

export class WordToken extends Token {
	constructor(tag: Tag, public lexeme: string, loc: { start: Loc; end: Loc; }) {
		super(tag, loc);
	}

	toString(): string {
		return `Word: \`${this.lexeme}\``;
	}
}

export class OperatorToken extends Token {
	constructor(tag: Tag, public lexeme: string, loc: { start: Loc; end: Loc; }) {
		super(tag, loc);
	}

	toString(): string {
		return `Operator: \`${this.lexeme}\``;
	}
}
