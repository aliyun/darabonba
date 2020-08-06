# 复合类型

## 介绍

除了上文介绍的基础类型外，`Darabonba` 还提供了 `Array`(数组)、`Map`、`object` 这样的复合类型为开发者生成各语言代码提供了更多的支持。

## Array

`Darabonba` 像其他语言一样可以操作数组元素，它携带一个叫做元素类型的描述。可以通过 `[ itemType ]` 的方式来定义数组，其中的 `itemType` 可以是基础类型、复合类型以及 [`Model`](./model.md)。

```js
var numArr: [ number ] = [1, 2, 3];
var strArr: [ string ] = ['a', 'b', 'c'];
var anyArr: [ any ] = ['1', '2', 3, true, [1, 'a']];
var complexArr: [ map[string]string ] = [{ str1 = 'string' }, { str2 = 'string' }];
```

## Map

`Darabonba` 提供了 `Map` 类型是用来处理那些无法枚举其属性的对象。`Map` 有两个类型分别为 `keyType` 和 `valueType`。声明方式为 `map[keyType]valueType`。这里的 `keyType` 只能为 `string` 类型，而 `valueType` 可以为基础类型、复杂类型及 `Model`。

```js
var numMap: map[string]number = {
  num = 1
};
var strMap: map[string]string = {
  str = 'string'
};
var anyMap: map[string]any = {
  str = 'string',
  num = 1,
  bool = true,
  subMap = {
    subStr = 'string'
  }
};
```

## object

`Darabonba` 提供了 `object` 类型，等价于 `map[string]any`。

```js
var obj: object = {
  str = 'string',
  num = 1,
  bool = true,
  subMap = {
    subStr = 'string'
  }
};
```
