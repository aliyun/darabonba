// Originally written by @JacksonTian, migrated to TypeScript by @GZGavinZhao.
//
// Original code (JS version) is written under an MIT license, available here:
// https://github.com/JacksonTian/skyline
//
// Thank you so much for your original work!

import { Lexer } from './lexer';

export class Parser {
	lexer: Lexer;
	look: any;

	constructor(lexer: any) {
		this.lexer = lexer;
		this.look = undefined;
	}

	tagTip(_tag: any) {
		throw new Error('Need to implement tagTip method!');
	}

	move() {
		throw new Error('Need to implement move method!');
	}

	match(tag: any) {
		if (this.look.tag === tag) {
			this.move();
		} else {
			this.error(`Expect ${this.tagTip(tag)}, but ${this.tokenTip(this.look)}`);
		}
	}

	matchWord(tag: any, lexeme: any) {
		if (this.look.tag === tag && this.look.lexeme === lexeme) {
			this.move();
		} else {
			this.error(`Expect ${this.tagTip(tag)} ${lexeme}, but ${this.tokenTip(this.look)}`);
		}
	}

	is(tag: any) {
		return this.look.tag === tag;
	}

	isWord(tag: any, lexeme: any) {
		return this.look.tag === tag && this.look.lexeme === lexeme;
	}

	tokenTip(token: { tag: any; }) {
		if (!token.tag) {
			return 'EOF';
		}

		return this.look;
	}

	error(message: string) {
		const lexer = this.lexer;
		const token = this.look;
		console.log(`${lexer.filename}:${token.loc.start.line}:${token.loc.start.column}`);
		console.log(`${lexer.source.split('\n')[token.loc.start.line - 1]}`);
		console.log(`${' '.repeat(token.loc.start.column - 1)}^`);
		const prefix = `Unexpected token: ${this.tokenTip(token)}.`;
		throw new SyntaxError(`${prefix} ${message}`);
	}
}
