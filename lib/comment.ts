export function getFrontComments(comments, index: number) {
	let ret = [];
	while (index-- >= 0) {
		const comment = comments.get(index);
		if (!comment) {
			break;
		}
		ret.unshift(comment);
	}
	return ret;
}

export function getBackComments(comments, index: number) {
	let ret = [];
	while (index++) {
		const comment = comments.get(index);
		if (!comment) {
			break;
		}
		ret.push(comment);
	}
	return ret;
}

export function getBetweenComments(comments, begin: number, end: number) {
	let ret = [];

	for (; begin < end; begin++) {
		const comment = comments.get(begin);
		if (!comment) {
			continue;
		}
		ret.push(comment);
	}
	return ret;
}
