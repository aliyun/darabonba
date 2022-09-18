export class Token {
	tag: string;
	loc: number;

	constructor(tag: string, loc: number) {
		this.tag = tag;
		this.loc = loc;
	}

	toString() {
		return `${this.tag}`;
	}
}
