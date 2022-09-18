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
