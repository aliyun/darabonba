// Originally written by @JacksonTian, migrated to TypeScript by @GZGavinZhao.
//
// Original code (JS version) is written under an MIT license, available here:
// https://github.com/JacksonTian/skyline
//
// Thank you so much for your original work!

export class Loc {
	constructor(public line: number, public column: number) { }
}

export class Token {
	loc: { start: Loc, end: Loc };

	constructor(public tag: string, loc: { start: Loc, end: Loc }) {
		this.tag = tag;
		this.loc = loc;
	}

	toString() {
		return `${this.tag}`;
	}
}
