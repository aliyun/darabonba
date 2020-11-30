'use strict';

function getComponentName(m) {
  if (m.pkg) {
    return `${m.pkg}.${m.name}`;
  }
  return `${m.name}`;
}

function display(item) {
  if (item.type === 'basic') {
    return item.name;
  }

  if (item.type === 'map') {
    return `map[${display(item.keyType)}]${display(item.valueType)}`;
  }

  if (item.type === 'array') {
    return `[${display(item.itemType)}]`;
  }

  if (item.type === 'module') {
    return getComponentName(item);
  }

  if (item.type === 'model') {
    return item.name;
  }

  if (item.type === 'interface') {
    return getComponentName(item);
  }

  console.log(item);
  throw new Error('unimplemented.');
}

function isSameType(expect, actual) {
  if (expect.type === 'basic' && actual.type === 'basic') {
    return expect.name === actual.name;
  }

  if (expect.type === 'array' && actual.type === 'array') {
    return isSameType(expect.itemType, actual.itemType);
  }

  if (expect.type === 'map' && actual.type === 'map') {
    return isSameType(expect.keyType, actual.keyType) &&
      isSameType(expect.valueType, actual.valueType);
  }

  if (expect.type === 'module' && actual.type === 'module') {
    return expect.name === actual.name;
  }

  if (expect.type === 'model' && actual.type === 'model') {
    return expect.name === actual.name;
  }

  return false;
}

module.exports = {
  display,
  getComponentName,
  isSameType
};
