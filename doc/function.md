# function

## 介绍

`Darabonba` 除了 `API` 以外，也提供了 `Function` 关键字用来定义普通的函数，它可以像 `API` 方法一样使用定义的模块属性，示例如下。

```js
// 模块属性
type @operator = string

// 模块初始化函数
init(operator: string) {
  @operator = operator;
}

function test(action: string): string {
  return `${@operator} do ${action}`;
}
```

## static function

在上篇文章[模块化](./module.md)中，我们提到过模块中可以定义静态方法，可以在直接通过模块包的引用来调用，通过 `static function` 定义的方法与模块中通过 `function` 定义的方法不同，它无法使用模块的属性，示例如下。

```js
static function test(str: string): string {
  return str;
}
```

## async function

在 `Darabonba` 中还提供了 async function 关键字定义异步方法，通过 `async function` 关键字定义的异步方法可以让 `TypeScript`、`C#` 这样有异步方法语言的生成器根据该关键字生成对应的异步操作，例如在生成的 `TypeScript` 代码中的方法会带上 `async` 关键字，同时在调用对应的异步方法时也会同时加上 `await` 关键字，`api` 方法默认为异步方法。

```js
static async function staticAsyncTest(str: string): string {
  return str;
}

async function asyncTest(str: string): string {
  return str;
}
```

## 方法声明

在 `Darabonba` 中也提供了方法声明，跟 `function` 类似，只是方法声明不提供方法体。 `Darabonba` 作为描述性语言，无法实现一些复杂逻辑，所以需要通过方法声明、在各语言中生成 `unimplement` 的方法，开发者可以自行实现各语言逻辑从而提供更完善的功能，例如在 `api` 示例中的 `Util` 模块就是一个含有大量方法声明的模块，从而为 `api` 中的复杂逻辑实现提供可能。

```js
/**
 * This is a utility module
 */

static async function readAsJSON(stream: readable): any;

static function equalNumber(val1: number, val2: number): boolean;

static function assertAsMap(value: any): map[string]any;
```
