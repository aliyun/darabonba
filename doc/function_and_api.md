# API & Function

## 介绍

api & function 是 Darabonba 的核心，Darabonba 主要是特定于描述 OpenAPI 的语言，所以 api & function 才是 Darabonba 脚本中主要的定义行为的地方，而之前介绍的基础类型、复杂类型和 Model 都是为了更好的定义 api & function。同时 Darabonba 为 api & function 的定义添加了许多不同于其他语言的功能，让我们可以更容易、更准确的描述 OpenAPI。

## API

Darabonba 可以通过 api 关键字定义方法的逻辑来更好的描述 OpenAPI，我们通过下面的例子来讲述。

```dara
import Util;

type @endpoint = string
type @protocol = string

model RuntimeOptions {
  autoretry: boolean,
  ignoreSSL: boolean,
  maxAttempts: number
}

model UserRequest {
  name: string
}

model UserResponse {
  name: string,
  age: number,
  organization: string,
  department: string
}

init(endpoint: string, protocol: string) {
  endpoint = @endpoint;
  protocol = @protocol;
}

api getUser(request: UserRequest, runtime: RuntimeOptions): UserResponse {
  // 描述请求相关信息
  __request.protocol = @protocol;
  __request.method = 'GET';
  __request.pathname = `/user`;
  __request.headers = {
    host = @endpoint,
    content-type = 'application/json'
  };
  __request.query = {
    name = request.name
  };
} returns {
  // 描述返回相关信息
  if (!Util.equalNumber(__response.statusCode, 200)) {
    throw {
      message = `Reqeust Failed!`,
      code = `${__response.statusCode}`
    };
  }
  var result = Util.assertAsMap(Util.readAsJSON(__response.body));
  return result;
} runtime {
  // 描述运行时参数
  timeouted = 'retry',
  retry = {
    retryable = runtime.autoretry,
    maxAttempts = runtime.maxAttempts
  },
  ignoreSSL = runtime.ignoreSSL
}
```

可以看出整个 API 的定义分为三部分：

- 第一部分跟其他语言里的 function 的定义类似，不过 Darabonba 在这一部分中加入了默认的变量 `__request` 其类型为 `$Request`，这个变量用以在请求 API 时设置请求相关信息。
- 第二部分则是跟 API 返回相关的逻辑，这一部分则是加入了默认参数 `__response` 其类型为 `$Response`，此变量包含了请求返回的相关信息，开发者可以通过此变量获得 API 返回的状态码以及返回数据。
- 第三部分包含了 API 请求时相关的运行参数，包括重试策略、幂等策略以及 `SSL` 设置等相关信息。

## function

Darabonba 除了 api 以外，也提供了 function 关键字用来定义普通的函数，其中可以像 api 方法一样使用定义的模块属性，示例如下。

```dara
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

### static function

在上篇文章[模块包](./module.md)中，我们提到过模块中可以定义静态方法，可以在直接通过模块包的引用来调用，通过 static function 定义的方法与模块中通过 function 定义的方法不同，它无法使用模块的属性，示例如下。

```dara
static function test(str: string): string {
  return str;
}
```

### async function

在 Darabonba 中还提供了 async function 关键字定义异步方法，通过 async function 关键字定义的异步方法可以让 TypeScript、C# 这样有异步方法语言的生成器根据该关键字生成对应的异步操作，例如在生成的 TypeScript 代码中的方法会带上 `async` 关键字，同时在调用对应的异步方法时也会同时加上 `await` 关键字，api 方法默认为异步方法。

```dara
static async function staticAsyncTest(str: string): string {
  return str;
}

async function asyncTest(str: string): string {
  return str;
}
```

## Interface

在 Darabonba 中也提供了 interface 方法，interface 方法的定义跟定义 function 类似只是不提供方法体，因为 Darabonba 作为描述性语言，无法实现一些复杂逻辑，所以需要通过 interface 方法在各语言中生成 unimplement 的方法，开发者可以自行实现各语言逻辑从而提供更完善的功能，例如在 api 示例中的 Util 模块就是一个含有大量 interface 方法的模块，从而为 api 中的复杂逻辑实现提供可能。
```dara
/**
 * This is a utility module
 */

static async function readAsJSON(stream: readable): any;

static function equalNumber(val1: number, val2: number): boolean;

static function assertAsMap(value: any): map[string]any;
```