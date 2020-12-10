# 基于 Darabonba 编写工具模块

Darabonba 其核心能力是描述 OpenAPI，缺少复杂逻辑实现的能力，为了弥补这个能力 Darabonba 设计了工具模块的概念。与 Java 中的 `interface` 接口类型定义类似，Darabonba 的接口模块即是只在 Darabonba 编写的 DSL 代码中只定义方法体的集合而并不实现其具体逻辑，其逻辑则是由各语言分别实现。

## Console 工具模块实现

控制台输出日志，是开发调试中最常用的方式，Darabonba 也提供了 `Console` 模块，方便在生成的 SDK 中加入一定的调试性语句，下面将以 `Console` 模块为例讲解如何开发一个工具模块。首先，第一步还是先创建 Darafile。


```js
{
  "scope": "darabonba",
	"name": "Console",
	"version": "1.0.0",
  "main": "./main.dara",
  // 对应实际的包名
	"releases": {
		"go": "github.com/alibabacloud-go/tea-console/client:v1.0.0",
		"ts": "@alicloud/tea-console:^1.0.0",
		"csharp": "AlibabaCloud.TeaConsole:0.1.0",
		"java": "com.aliyun:tea-console:0.0.1",
		"php": "alibabacloud/tea-console:^0.1.0",
		"python": "alibabacloud_tea_console:0.0.1"
  }
  // 各语言配置可在 Github 仓库中仔细查看
}
```
在工具模块的 Darafile 中最重要的信息就是 `releases` 中各语言模块发布其对应仓库的信息，这条信息会在使用该模块的 Darabonba 生成的 SDK 体现。在 main.dara 文件中我们定义我们需要的方法的申明：


```js
/**
 * This is a console module
 */

/**
 * Console val with log level into stdout
 * @param val the printing string
 * @return void
 * @example \[LOG\] tea console example
 */
static function log(val: string): void;

```

### 实现各语言逻辑
通过这里的申明，可以让 Darabonba 的编译器识别模块中的方法，并能校验入参和出参，而具体的各语言的逻辑则由各语言分别实现：

- Java 中可以通过 `System.out.println` 来实现对应的方法：

```Java
package com.aliyun.teaconsole;

public class Client {
  public static void log(String val) throws Exception {
      System.out.println(String.format("[LOG] %s", val));
  }
}
```

- TypeScript 中可以通过 `console.log` 来实现对应的方法：

```js
import * as $tea from '@alicloud/tea-typescript';


export default class Client {

  static log(val: string): void {
    console.log('[LOG] ' + val);
  }

}
```

- Go 中可以通过 `fmt.Printf` 来实现对应的方法：

```go
package client

import (
	"fmt"
	"os"

	"github.com/alibabacloud-go/tea/tea"
)
func Log(val *string) {
	fmt.Printf("[LOG] %s\n", tea.StringValue(val))
}
```

- Python 中可以通过 `print` 来实现对应的方法：

```py
class Client:
    @staticmethod
    def log(val):
        print('[LOG] %s' % val)

```

- C# 中可以通过 `Console.WriteLine` 来实现对应的方法：

```cs
using System;

namespace AlibabaCloud.TeaConsole
{
    public class Client 
    {
        public static void Log(string val)
        {
            Console.WriteLine("[LOG] " + val);
        }
    }
} 
```

- PHP 中可以通过 `Logger` 对象的 `log` 方法来实现对应的方法：

```php
<?php

namespace AlibabaCloud\Tea\Console;

use Monolog\Handler\AbstractProcessingHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;

class Console
{
    public static function log($val)
    {
      $loggerDriver = new Logger('tea-console-log');
      $loggerDriver->pushHandler(new StreamHandler('php://stderr', 0));
      $loggerDriver->log(200, $val);
    }
}
```

### 发布各语言模块

在实现了各个方法以后，为了能让使用这些模块的 SDK 能够正常的使用，还需要发布各语言的模块包到各语言对应的仓库中，发布的包信息就是 Darafile 的 `releases` 信息中，以 `Console` 模块为例：

- Java 需要通过 `mvn clean source:jar javadoc:jar package deploy -Dmaven.test.skip=true` 发布 maven 包，其 pom.xml 文件中需要具备以下信息:

```xml
  <groupId>com.aliyun</groupId>
  <artifactId>tea-console</artifactId>
  <version>0.0.1</version>
  <packaging>jar</packaging>
  <name>tea-console</name>
```

- TypeScript 需要通过 `npm publish --access=public` 发布 npm 包，其 package.json 文件中需要具备以下信息:

```js
{
  "name": "@alicloud/tea-console",
  "version": "1.0.0"
}
```

- Go 需要通过 `git push` 将源代码发布到 `releases.go` 所定义的 github 地址上，并 release 对应的版本 v1.0.0，其 go.mod 文件中需要具备以下信息:

```js
module github.com/alibabacloud-go/tea-console
```

- Python 需要首先通过执行 setup.py 文件打包成功后，再通过 `twine upload` 发布 pypi 包，其 setup.py 文件中需要具备以下信息:

```py
import os
from setuptools import setup, find_packages

PACKAGE = "alibabacloud_tea_console"
TOPDIR = os.path.dirname(__file__) or "."
VERSION = __import__(PACKAGE).__version__

```
在 `__init__.py` 中则需要确定版本号：

```py
__version__ = '0.0.1'
```

- C# 需要通过 `dotnet pack --configuration Release --output ${path}` 打包后，再通过 `dotnet nuget push *.nupkg --source nuget.org` 发布 nuget 包，其 *.csproj 文件中需要具备以下信息:

```xml
  <RootNamespace>AlibabaCloud.TeaConsole</RootNamespace>
  <OutputType>Library</OutputType>
  <AssemblyName>AlibabaCloud.TeaConsole</AssemblyName>
    <Version>0.1.0</Version>
```

- PHP 需要通过 `git push` 将源代码发布仓库后，再提交 github 地址到 [Packagist](https://packagist.org/)即可发布 composer 包，其 composer.json 文件中需要具备以下信息:

```js
{
  "name": "alibabacloud/tea-console",
  "type": "library"
}
```

在所有的包都发布成功以后，就可以通过 [Darabonba CLI](https://github.com/aliyun/darabonba-cli) 执行 `dara publish` 发布我们的工具模块到 Darabonba 的[模块仓库](https://darabonba.api.aliyun.com/module)，供大家使用了（欢迎参考 `Console` 模块的[完整代码](https://github.com/aliyun/tea-console)）。

## Console 工具模块使用

在成功的发布了工具模块以后，就可以在我们的 Darabonba 代码中使用它了，实现我们需要在 Darafile 引用它:

```js
{
  "scope": "alibabacloud",
  "name": "sample",
  "version": "0.0.1",
  "main": "main.dara",
  "libraries": {
    "Console": "darabonba:Console:*"
  },
  "java": {
    "package": "aliyun.com.alibabacloud.sample"
  },
  "csharp": {
    "namespace": "Alibabacloud.Sample"
  },
  "php": {
    "package": "Alibabacloud.Sample"
  },
  "python": {
    "package": "alibabacloud_sample"
  }
}
```

接下来，我们就可以在 Darabonba 代码中使用刚刚发布的 `Console` 模块来进行使用了：

```js
import Console;

static async function main(args: [ string ]) throws : void {
  Console.log("hello world!");
}
```
这里我们简单的使用 `Console` 模块中的静态方法 `log` 来打印字符串，如果要使用实例方法可参考文档 [Function](./doc/function.md)，在完成了 Darafile 和 main.dara 文件的编写后就可以使用 [Darabonba CLI](https://github.com/aliyun/darabonba-cli) 先执行安装命令 `dara install`，然后即可执行生成命令 `dara codegen [lang] [output]` 来生成各语言的代码了，从生成的各语言代码中，我们可以看到在 `Console` 模块的 Darafile 中定义的各语言包都被生成到了各语言代码的依赖文件中:

- Java 的 pom.xml 文件中可以在 `dependencies` 子标签中看到：

```xml
  <dependency>
    <groupId>com.aliyun</groupId>
    <artifactId>tea-console</artifactd>
    <version>0.0.1</version>
  </dependency>
```
通过 `mvn install` 即可安装 `Console` 模块对应的依赖。

- TypeScript 的 package.json 文件中可以在 `dependencies` 属性中看到：

```js
{
  "@alicloud/tea-console": "^1.0.0"
}
```
通过 `npm install` 即可安装 `Console` 模块对应的依赖。

- Go 的 go.mod 文件中可以在 `require` 中看到：

```js
  github.com/alibabacloud-go/tea-console v1.0.0
```
通过 `go get` 即可安装 `Console` 模块对应的依赖。

- Python 的 setup.py 文件中可以看到：

```py
REQUIRES = ["alibabacloud_tea_console>=0.0.1, <1.0.0"]
```
通过 `pip install` 即可安装 `Console` 模块对应的依赖。

- C# 的 *.csproj 文件中可以看到：

```xml
<ItemGroup>
  <PackageReference Include="AlibabaCloud.TeaConsole" Version="0.1.0"/>
</ItemGroup>
```
通过 `dotnet add package` 即可安装 `Console` 模块对应的依赖。

- PHP 的 composer.json 文件中可以在 `require` 属性中看到：

```js
{
  "alibabacloud/tea-console": "^0.1.0"
}
```
通过 `composer install` 即可安装 `Console` 模块对应的依赖。



