# API

## 介绍

`Darabonba` 作为为`OpenAPI` 而生的语言， `API` 和 [Function](./function.md) 是 `Darabonba` 的核心。上文介绍的基础类型、复杂类型和 `Model 类型` 都是为了更好的描述 `API` 和 `Function`。同时 `Darabonba` 为 `API` & `Function` 的定义添加了许多不同于其他语言的功能，让我们可以更容易、更准确的描述 `OpenAPI`。

## API 语法

`Darabonba` 可以通过 `api` 关键字定义方法的逻辑来更好的描述 `OpenAPI`，我们通过下面的例子来讲述。

```js
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
  return {
    ...result
  };
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

整个 API 的定义分为三部分：

- 第一部分： 与大多数高等语言中 `function` 的定义不同，`Darabonba` 在这一部分中加入了默认的变量 `__request` 其类型为 `$Request`，这个变量用以在请求 `API` 时设置请求相关信息。
- 第二部分： `API` 返回相关的逻辑与定义，这一部分则是加入了默认参数 `__response`，其类型为 `$Response`，此变量包含了请求返回的相关信息，开发者可以通过此变量获得 `API` 返回的状态码以及返回数据。
- 第三部分： `API` 请求时相关的运行参数。包括重试策略、幂等策略以及 `SSL` 设置等相关信息。
