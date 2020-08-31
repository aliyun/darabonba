# 控制语句

## 介绍

跟大多数的语言一样，`Darabonba` 也提供了控制语句来完成逻辑判断、循环以及错误处理。

## if 语句

对于逻辑判断，我们可以使用 `if` 语句来完成，以下是 `if` 语句的语法：

    if (condition) statement1 else if (condition2) statement2 else statement3

其中的 condition 为条件表达式，该表达式的结果必须是布尔值，目前 `Darabonba` 暂不支持用条件判断操作符例如 `>`、`<`、`==` 等符号进行条件判断，所以需要依赖方法进行判断，请参考下面的示例：

```js
import Util;

type @status = number

init(code: number) {
  if (Util.equalNumber(code, 200)) {
    @status = code;
  } else {
    @status = 200;
  }
}
```

`Darabonba` 跟其他语言一样也支持逻辑链接符：`&&`、`||`、`!`，示例如下：

```js
import Util;

type @message = string

init(code: number) {
  if (Util.is4xx(code) || Util.is5xx(code) ) {
    @message = 'server error!';
  } else if (!Util.is2xx(code)) {
    @message = 'unkown error!';
  } else {
    @message = 'success';
  }
}
```

## while 语句

对于一门编程语言而言循环是必不可少的，`Darabonba` 目前提供了前测试循环语句 `while` 语句，暂时未提供后测试循环语句 `do-while`, 以下是 `while` 语句的语法：

    while (condition) statement

其中条件表达式 condition 与 `if` 语句一样，暂不支持使用 `>`、`<`、`==` 等符号进行判断，只支持 `&&`、`||`、`!` 等逻辑连接符，示例如下：

```js
import Util;
import Console;

init(time: number) {
  while (Util.equalNumber(time, 0)) {
    Console.log('loop!');
    time = 0;
  }
}
```
## for 语句

除了通过 `while` 以外， `Darabonba` 还提供了编程语言中最常用的循环语句 `for` 语句，不过 `Darabonba` 中的 `for` 循环并不是常见的三表达式形循环而是列表循环，以下是 `for` 语句示例：

```js
import Console;

init(nums: [ number ]) {
  for (var num : nums) {
    Console.log(`number: ${num}!`);
  }
}
```
## break 语句

`Darabonba` 也提供了 `break` 可以强制跳出循环，以下是 `break` 语句示例：

```js
import Console;
import Util;

init(nums: [ number ]) {
  for (var num : nums) {
    if(Util.equalNumber(num, 0)){
      Console.log('break');
      break;
    }
  }
}
```

## throw 语句

`Darabonba` 提供 `throw` 语句可以在特定的情况抛出自定义的错误，以下是 `throw` 语句示例：

```js
import Util;

init(nums: [ number ]) {
  for (var num : nums) {
    if(Util.equalNumber(num, 0)){
      throw {
        message = `error number: ${num}`,
        code = `${num}`
      };
    }
  }
}
```

在通过 `function` 语句定义的方法时，可使用 `throw` 语句标识定义的方法可能会抛错，示例如下：

```js
static function test(param : string) throws : string;
```


## try 语句

`Darabonba` 提供 `try` 语句可以对代码中抛出的错误进行捕获，以下是 `try` 语句示例：

```js
import Util;
import Console;

init(nums: [ number ]) {
  try {
    for (var num : nums) {
      if(Util.equalNumber(num, 0)){
        throw {
          message = `error number: ${num}`,
          code = `${num}`
        };
      } 
    }
  } catch(err){
    Console.log(err.message);
  } finally {
    Console.log('end!');
  }
}
```