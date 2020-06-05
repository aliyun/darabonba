'use strict';

function getFrontComments(comments, index) {
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

function getBackComments(comments, index) {
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

function getBetweenComments(comments, begin, end) {
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
  
module.exports = {
  getFrontComments,
  getBackComments,
  getBetweenComments
};
