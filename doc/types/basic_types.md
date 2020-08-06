# 基本类型

## 介绍

为了能够通过 `Darabonba` 生成各语言对应的代码，我们需要使用最通用的原子类型：`Boolean`(布尔值)、`Number`(数字)、`String`(字符串)、字节序列等。

## Boolean

最基本的数据类型就是简单的 `true`/`false` 值，在 `Darabonba` 里叫做 `boolean` 。

```js
var bool: boolean = true;
```

## Number

在 `Darabonba` 中数值的类型最基础的就是 `number` 这样的通用类型

```js
var num: number = 123;
var numLong: number = 123456L;
var numFloat: number = 1.23;
var floatLiteral: number = 1.23f;
var numDouble: number = 1.23d;
```

除了支持通用数值类型 `number`，`Darabonba` 还支持通过字面量定义如下更准确的类型：

```js
var intNum: integer = null;
var int8Num: int8 = null;
var uint8Num: uint8 = null;
var int16Num: int16 = null;
var uint16Num: uint16 = null;
var int32Num: int32 = null;
var uint32Num: uint32 = null;
var int64Num: int64 = null;
var uint64Num: uint64 = null;
var longNum: long = null;
var ulongNum: ulong = null;
var floatNum: float = null;
var doubleNum: double = null;
```

按数据的比特长度来区分，`Darabonba` 多种详细的数据类型如下表所示。

| 长度 |   有符号   |       无符号 | 浮点型 |
| ---- | :--------: | -----------: | -----: |
| 8    |    int8    |        uint8 |
| 16   |   int16    |       uint16 |
| 32   |   int32    |       uint32 |  float |
| 64   | int64/long | uint64/ulong | double |

## String

像其它语言里一样，`Darabonba` 使用 `string` 表示文本数据类型。 和 JavaScript 一样，可以使用双引号（"）或单引号（'）表示字符串。

```js
var name: string = "jackson";
name = "peze";
```

`Darabonba` 还支持模版字符串，它可以定义多行文本和内嵌表达式。 这种字符串是被反引号包围（` \``），并且以 `\${ expr }`这种形式嵌入表达式

```js
var name: string = `page`;
var age: number = 27;
var sentence: string = `Hello, my name is ${name}.

I'm ${age} years old.`;
```

目前暂时**不支持**通过如下的方式来达到同样的效果：

```js
var sentence: string =
  "Hello, my name is " + name + ".\n\n" + "I'm " + age + " years old.";
```

## Bytes 字节序列

`Darabonba` 提供了字节序列，目前只支持赋值 `null` 给 `bytes` 类型的变量。

```js
var data: bytes = null;
```

## readable

`Darabonba` 定义了 `readable` 类型来为流式数据的传输提供了支持，可以将字符串赋值给 `readable` 类型的变量。

```js
var readStream: readable = null;
```

## writable

`Darabonba` 定义了 `writable` 类型来为流式数据的传输提供了支持，目前只支持赋值 `null` 给 `writable` 类型的变量 。

```js
var data: writable = null;
```

## Any

有时候，我们会想要为那些在编程阶段还不清楚类型的变量指定一个类型。这些值可能来自于动态的内容，比如来自用户输入或第三方代码库。这种情况下，我们不希望类型检查器对这些值进行检查而是直接让它们通过编译阶段的检查。那么我们可以使用 any 类型来标记这些变量：

```js
var anyVal: any = 4;
anyVal = "maybe a string instead";
anyVal = false;
```
