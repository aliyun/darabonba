export class Env {
	preEnv: Env;
	map: Map<string, string>;

	constructor(preEnv: Env) {
		this.preEnv = preEnv;
		this.map = new Map();
	}

	set(key: string, value: string) {
		this.map.set(key, value);
	}

	has(key: string) {
		return this.map.has(key);
	}

	hasDefined(key: string) {
		if (this.map.has(key)) {
			return true;
		}

		if (this.preEnv) {
			return this.preEnv.hasDefined(key);
		}

		return false;
	}

	get(key: string) {
		if (this.map.has(key)) {
			return this.map.get(key);
		}

		if (this.preEnv) {
			return this.preEnv.get(key);
		}

		return null;
	}
}
