# 基于 Darabonba 编写 SDK

本节的内容将通过演示 Darabonba CLI 使用的核心 SDK——[Darabonba Repo Client](https://github.com/aliyun/darabonba-repository-client) 的实现过程，来讲解如何通过 Darabonba 描述自己的 OpenAPI 从而生成多语言 SDK 提供给 OpenAPI 的消费者使用。

## 选择工具模块

要实现一个可用的 SDK 工具模块是必不可少的，在通过 Darabonba 描述 OpenAPI 之前我们必须确定我们需要哪些工具模块，在 SDK 的生成过程中，我们累积了很多常用的方法并封装成了一个工具模块，就是 Darbaonba 官方提供的 [Darabonba Util](https://github.com/aliyun/tea-util)，通过 `Util` 工具模块可以帮助我们完成下列复杂逻辑：

- 使用 `readAsJSON` 方法服务端返回的流读取并按 `JSON` 格式解析
- Darabonba 目前缺少了一些逻辑表达的语句解析能力，所以也需要用到 `Util` 工具模块的 `equalNumber` 方法来比对 Http 状态码。
- Darabonba 是强类型语言，但目前缺少类型断言的相关逻辑表达，`Util` 工具模块的 `assertAs[type]` 相关方法则弥补了这块缺失。
- 使用 `toJSONString` 方法将 Model 的实例或 map 类型的变量转换为 `JSON` 字符串。
- 处理 API 的 `query` 入参时需要使用该方法使用 `stringifyMapValue` 方法将 `map[string]any` 类型的变量转换为 `map[string]string`。

`Darabonba CLI` 中还有一个重要的功能就是发布模块，这个功能涉及到通过文件流的形式上传模块的压缩包，所以我们还需要一个官方提供的文件上传模块 [Darabonba FileForm](https://github.com/aliyun/tea-fileform)，通过该模块我们可以在轻易的描述 OpenAPI 的文件上传功能。`Darbaonba Repo` 只用到了上述的两个模块，如果编写 Darabonba 脚本时还需要更多的工具模块支持，可以到[模块仓库](https://darabonba.api.aliyun.com/module)中搜索，如果需要支持自有的签名算法或者一些特殊的逻辑则可以参考[基于 Darabonba 编写工具模块](./demo_util.md)来编写并制作自己的 Darabonba 工具模块。

## 描述 OpenAPI 的 Darabonba 编写

在工具模块完成以后，就可以开始通过 Darabonba 描述 OpenAPI 并生成对应的 SDK。

### 初始化函数编写

 在描述 OpenAPI 之前，我们首先需要给 SDK 需要一个初始化的函数，也就是当前 Darabonba 的构造函数： 
 
 ```js
import Util;
import FileForm;

type @auth = string
type @endpoint_host = string
type @protocol = string

model Config {
  endpoint: string,
  protocol: string,
  auth: string
}

/**
 * init the client
 * @param config Config of the config
 */
init(config: Config) {
  @endpoint_host = config.endpoint;
  @auth = config.auth;
  @protocol = config.protocol;
}
 ```
我们首先通过 `type` 命令定义模块的私有属性，这些属性可以在模块中全局使用，通过 `init` 中传入的 `Config` 类型参数来初始化。Darbaonba Repo 中只需要三个参数：

- 服务端用以鉴权的参数 `auth` 
- 指定请求地址的参数 `endpoint_host` 
- 指定请求相关协议的参数 `protocol` 

这里开发者可以根据自身的情况添加自己需要的参数，例如默认的请求过期时间参数或忽略 SSL 证书相关的默认参数等。

### 下载模块 API 的实现

在 Darabonba CLI 中最重要的功能应该下载项目需要的 Darabonba 模块，通过该功能我们可以使用已有的 Darabonba 模块在避免重复造轮子的同时还能给生成的 SDK 以更丰富的功能和极佳的体验，要实现下载 OpenAPI 的描述，我们首先需要使用 OpenAPI 的入参和出参来实现其对应的 `Model`:

 ```js
model DownloadModuleRequest {
  specs: string(description='需要下载的模块信息列表，例：<模块组织/模块名/模块版本,模块组织/模块名/模块版本>', name='specs')
}

model DownloadModuleResponse {
  ok: boolean(description='接口返回数据的状态', name='ok'),
  download_list: [{
    dist_tarball: string(description='真实的模块包下载地址', name='dist_tarball'),
    dist_shasum: string(description='模块包的数据校验字段', name='dist_shasum'),
    dist_size: number(description='模块包的大小', name='dist_size')
  }]
}
 ```

通过定义在 Darabonba 中定义 OpenAPI 的入参和出参的 `Model`，不仅可以让[远端仓库](https://darabonba.api.aliyun.com/module)更好的展示模块的详情，也可以让生成的 SDK 给予 OpenAPI 的消费者更好的体验。接下来我们就通过入参和出参的 `Model` 来配合实现下载 OpenAPI:

```js
api downloadModule(pathname: string, query: DownloadModuleRequest): DownloadModuleResponse {
  __request.protocol = @protocol;
  __request.method = 'GET';
  __request.pathname = `/download/modules`;
  __request.headers = {
    host = @endpoint_host,
    accept = 'application/json'
  };
  __request.query = Util.stringifyMapValue(query);
} returns {
  var result = Util.assertAsMap(Util.readAsJSON(__response.body));

  if (!Util.equalNumber(__response.statusCode, 200)) {
    throw {
      message = `code: ${__response.statusCode}, ${result.code} reason: ${result.message}`,
      code = `${result.code}`
    };
  }

  if (!Util.assertAsBoolean(result.ok)) {
    throw {
      message = `code: ${result.status}, ${result.code} reason: ${result.message}`,
      code = `${result.code}`
    };
  }
  return {
    ...result
  };
} runtime {
  timeout = 10000 // 10s 的过期时间
}
```

在 `api` 方法中，我们在第一部分中定义请求相关的信息，通过 `__request` 和全局变量设置了请求通用参数的协议(`protocol`)和请求的地址(`headers.host`)，并设置了 API 特有的请求方法(`method`)、请求路径(`pathname`)、指定返回类型(`headers.accept`)以及请求的入参)(`query`)。如果接口需要鉴权只需要将我们的通用参数 `@auth` 传入请求头即可： 

```js
__request.headers = {
  host = @endpoint_host,
  accept = 'application/json',
  authorization = @auth
};
```
第二部分则是处理请求返回的相关情况，通过 `__response` 我们可以获得返回的 HTTP 请求的状态码(`statusCode`)以及返回的信息(`body`)。通过 `__response.body` 获取到的是返回信息的流，我们可以通过 `Util.readAsJSON` 来将服务端返回的 `JSON` 数据读出并解析，因为 `Util.readAsJSON` 返回的是一个 `any` 的类型无法直接使用，所以我们需要根据服务端的返回数据的情况将其断言为正确的类型，本例中通过 `Util.assertAsMap` 将其断言为 `map` 类型，在通过 `Util` 模块的逻辑判断函数进行一定的判断后就可以返回该结果。返回的 `result` 是一个 `map` 类型，但因为 `api` 的返回类型为 `DownloadModuleResponse`，所以这里会把 `map` 类型会被自动转换为正确的类型。

第三部分真是描述 API 的一些事务性参数，这里我们只设置了超时时间(`timeout`)，这一部分还有更多可以进行事务性表达的参数：

```js
{
  timeout?: number(description='read timeout'), // 超时时间
  readTimeout?: number(description='read timeout'), // 读取数据超时时间
  connectTimeout?: number(description='connect timeout'), // 链接超时超时时间
  httpProxy?: string(description='http proxy url'), // http 代理
  httpsProxy?: string(description='https Proxy url'), // https 代理
  maxIdleConns?: number(description='maximum number of connections'), // 连接池中的最大连接数，Java、C#、Go 语言有效
  retry = {
    retryable?: boolean(description='retry config'), // 是否重试
    maxAttempts?: number(description='maximum number of retries'), // 最大重试次数
  },
  ignoreSSL = runtime.ignoreSSL // 忽略 SSL 相关检查
}
```

### 登录 API 的实现

在 Darabonba CLI 中还有一个非常重要的功能就是登录，只有在登录以后才能发布属于自己的模块，同样第一步我们需要定义出入参的 `Model`:

```js
model LoginRequest {
  username: string(description='用户名', name='username'),
  password: string(description='密码', name='password'),
  email: string(description='邮箱地址', name='email')
}

model LoginResponse {
  ok: boolean(description='接口返回数据的状态', name='ok'),
  rev: string(description='登录成功后返回的 token', name='rev')
}
 ```
而 OpenAPI 的描述则与上面有所不同，因为是 POST 的接口所以我们需要设置 `__request.body` 来进行传参并且还要在 `__resquest.headers` 中指明 `Content-Type`:

```js
api login(pathname: string, body: LoginRequest): LoginResponse {
  __request.protocol = @protocol;
  __request.method = 'POST';
  __request.pathname = pathname;
  __request.headers = {
    host = @endpoint_host,
    accept = 'application/json',
    content-type = 'application/json; charset=utf-8'
  };

  __request.body = Util.toJSONString(body);
} returns {
  var result = Util.assertAsMap(Util.readAsJSON(__response.body));

  if (!Util.equalNumber(__response.statusCode, 200)) {
    throw {
      message = `code: ${__response.statusCode}, ${result.code} reason: ${result.message}`,
      code = `${result.code}`
    };
  }

  if (!Util.assertAsBoolean(result.ok)) {
    throw {
      message = `code: ${result.status}, ${result.code} reason: ${result.message}`,
      code = `${result.code}`
    };
  }
  @auth = Util.assertAsString(result.rev);
  return {
    ...result
  };
} runtime {
  timeout = 10000 // 10s 的过期时间
}
```

在第二个部分对于服务端返回的处理中，我们通过把服务端返回的 `rev` 设置到 `@auth` 中，就可以在客户端请求需要鉴权的接口时使用了。

### 发布模块 API 的实现

在完成了登录的 API 以后，就可以通过登录后的 `@auth` 字段进行 Darabonba 模块的发布了，这里就会用到我们之前提到的工具模块 `Filefrom` 来帮助我们实现文件的上传:

```js
model PublishModuleRequest {
  author: string(description='author', name='author'),
  name: string(description='name', name='name'),
  version: string(description='version', name='version'),
  scope: string(description='scope', name='scope'),
  darafile: string(description='darafile', name='darafile'),
  dara_ast: string(description='tea ast', name='dara_ast'),
  readme: string(description='readme', name='readme'),
  size: number(description='size', name='size'),
  file: FileForm.FileField
}

model publishResponse {
  ok: boolean(description='接口返回数据的状态', name='ok')
}
```
在入参的 `Model` 中的 `file` 字段用到了上传工具模块中的 `FileField`，通过该 `Model` 可以帮助我们获取通过 `multipart/form-data` 上传文件时必要的信息：

```js
model FileField {
  filename: string(description='文件名字', example='a.txt', default=''), 
  contentType: string(description='文件的 mime 类型', example='txt', default=''),
  content: readable(description='文件的流')
}
```
在获取了这些信息以后，我们就可以在 API 描述的 `__request` 中通过设置对应的参数来上传文件了：

```js
api publishModule(form: PublishModuleRequest): publishResponse {
  var boundary = FileForm.getBoundary();
  __request.protocol = @protocol;
  __request.method = 'POST';
  __request.pathname = `/publish/module`;
  __request.headers = {
    host = @endpoint_host,
    content-type = `multipart/form-data; boundary=${boundary}`,
    accept = 'application/json',
    authorization = @auth
  };
  __request.body = FileForm.toFileForm(form, boundary);
} returns {
  var result = Util.assertAsMap(Util.readAsJSON(__response.body));

  if (!Util.equalNumber(__response.statusCode, 200)) {
    throw {
      message = `code: ${__response.statusCode}, ${result.code} reason: ${result.message}`,
      code = `${result.code}`
    };
  }

  if (!Util.assertAsBoolean(result.ok)) {
    throw {
      message = `code: ${result.status}, ${result.code} reason: ${result.message}`,
      code = `${result.code}`
    };
  }
  return {
    ...result
  };
} runtime {
  timeout = 60000
}
```

在入参的描述中通过 `FileForm.getBoundary` 获取分隔符，并将其设置入 `__resquest.headers` 的 `Content-Type` 中，最后通过 `FileForm.toFileForm` 将入参的参数以及文件都组装为 `multipart/form-data` 类型的内容即可完成文件上传，通过 `FileForm` 工具模块实现的文件上传都是通过流的方式向服务端上传文件，所以不用担心生成的 SDK 会有内存泄漏的风险。

### 重构

从上面的代码中我们可以发现，出参部分的处理几乎一致，但是三个 API 写了三次，所以就会造成生成的 SDK 冗余代码过多，这里我们可以将相同逻辑用一个函数来实现即可：

```js
async function _handle(response: $Response): object {
  var result = Util.assertAsMap(Util.readAsJSON(response.body));

  if (!Util.equalNumber(response.statusCode, 200)) {
    throw {
      message = `code: ${response.statusCode}, ${result.code} reason: ${result.message}`,
      code = `${result.code}`
    };
  }

  if (!Util.assertAsBoolean(result.ok)) {
    throw {
      message = `code: ${result.status}, ${result.code} reason: ${result.message}`,
      code = `${result.code}`
    };
  }
  return result;
}
```
这里因为使用了 `Util.readAsJSON` 涉及异步读取流，所以方法需要加上 `async` 的关键字，通过抽取相同逻辑封装为一个方法复用生成的 SDK 就可以减少大量的冗余逻辑了：

```js
api login(pathname: string, body: LoginRequest): LoginResponse {
  __request.protocol = @protocol;
  __request.method = 'POST';
  __request.pathname = pathname;
  __request.headers = {
    host = @endpoint_host,
    accept = 'application/json',
    content-type = 'application/json; charset=utf-8'
  };

  __request.body = Util.toJSONString(body);
} returns {
  var result = _handle(__response);
  @auth = Util.assertAsString(result.rev);
  return {
    ...result
  };
} runtime {
  timeout = 10000 // 10s 的过期时间
}
```

同样的方式，因为 Darabonba Repo Client 中涉及大量的 Get 请求，而这些请求大部分逻辑都一致，所以我们也可以封装一个 `api` 来复用：

```js
api _get(pathname: string, query: $Model): object {
  __request.protocol = @protocol;
  __request.method = 'GET';
  __request.pathname = pathname;
  __request.headers = {
    host = @endpoint_host,
    accept = 'application/json'
  };

  if (!Util.isUnset(@auth)) {
    __request.headers.authorization = @auth;
  }

  __request.query = Util.stringifyMapValue(query);
} returns {
  // return result
  return _handle(__response);
} runtime {
  timeout = 60000
}
```
这样下载模块的代码就可以重写为：

```js
async function downloadModule(query: DownloadModuleRequest): DownloadModuleResponse {
  return _get(`/download/modules`, query);
}
```

通过一定的重构生成的 SDK 就能够精简很多的代码，这也是 Darabonba 的优势所在，不是单纯的使用 OpenAPI 定义加模板的方式生成，代码的方式具有更高的灵活性。
