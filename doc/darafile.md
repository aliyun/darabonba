# Darafile 详解

`Darafile` 是 `Darabonba` 的模块管理文件，类似 `Java` 中的 `pom.xml` 或者 `Node.js` 中的 `package.json`，下面我们将通过一个示例来详细介绍 `Darafile` 中所有的可配置项：

```js
{
  // 模块所属 scope，scope 可以在 https://darabonba.api.aliyun.com/admin/maintainer 中的创建
  "scope": "darabonba",
  // 模块的名字
  "name": "Sample",
  // 模块的版本号
  "version": "1.0.0",
  // 模块的主文件路径
  "main": "./main.dara",
  // 模块生成所依赖的其他模块
  "libraries": {
    // 属性名 TestModule 是 dara 脚本 import 时使用的名字
    // 属性值为远端模块的信息，格式为: scope:name:version
    "TestModule": "darabonba:TestModule:1.0.0"
  },
  // 模块生成的各语言 SDK 对应发布的版本的包名和对应版本，格式为 包名:版本
  // releases 中各语言的包名及版本是依赖该模块生成对应语言代码的依赖时使用的数据
  "releases": {
    // java中格式比较特殊，格式为 groupId:artifactId:version
    "java": "com.aliyun:sdk:2.0.6",
    "go": "github.com/alibabacloud-go/cs-20151215/client:v2.0.6",
    "csharp": "AlibabaCloud.SDK.CS20151215:2.0.6",
    "ts": "@alicloud/cs20151215:2.0.6",
    "php": "alibabacloud/cs-20151215:2.0.6",
    "python": "alibabacloud_cs20151215:2.0.6"
  },
  // 生成 Java 相关的个性化配置
  "java": {
    // 生成 Java 时必选参数，值为生成代码所属 package，也是生成路径
    "package": "com.aliyun.sdk",
    // 决定生成 Java 的 Client 文件的文件名，同时也是 Client 文件中 class 的名字，使用大驼峰
    "className": "SDKClient",
    // packageInfo 中的每一项都对应 pom.xml 中的同名信息
    // 只会在首次生成 pom.xml 时生效，以免人工改动 pom.xml 重置其信息
    "packageInfo": {
      "groupId": "com.aliyun",
      "artifactId": "sdk",
      "version": "2.0.6",
      "description": "Alibaba Cloud SDK for Java",
      "url": "https://github.com/aliyun/alibabacloud-sdk",
      "licenseName": "The Apache License, Version 2.0",
      "licenseUrl": "http://www.apache.org/licenses/LICENSE-2.0.txt",
      "developerId": "aliyunproducts",
      "developerName": "Aliyun SDK",
      "developerEmail": "aliyunsdk@aliyun.com",
      "scmConnection": "",
      "scmDeveloperConnection": "",
      "scmUrl": ""
    }
  },
  // 生成 Python 相关的个性化配置
  "python": {
    // 生成 python 包的包名，同时也是文件夹名，使用蛇形体
    "package": "alibabacloud_sdk",
    // 决定 client 文件的文件名与 client 类名，使用蛇形体
    "clientName": "client",
    // 决定生成 Python 包信息文件 setup.py 中相关内容
    "packageInfo": {
      // python 库名，配置 packeageInfo 必填
      "name": "alibabacloud_sdk",
      // 简介，配置 packeageInfo 必填
      "desc": "Alibaba Cloud SDK Library for Python",
      // github 地址，配置 packeageInfo 必填
      "github": "https://github.com/aliyun/alibabacloud-sdk",
      // 包作者
      "author": "Alibaba Cloud SDK",
      // 包作者邮箱
      "email": "sdk-team@alibabacloud.com",
      // 指定依赖，非必填
      "require": ["xxx>=0.0.1, <1.0.0", "xxx>=0.0.1, <1.0.0"]
    }
  },
  // 生成 Python2 相关的个性化配置
  "python2": {
    // 生成 python 包的包名，同时也是文件夹名，使用蛇形体
    "package": "alibabacloud_sdk_py2",
    // 决定 client 文件的文件名与 client 类名，使用蛇形体
    "clientName": "client",
    // 决定生成 Python 包信息文件 setup.py 中相关内容
    "packageInfo": {
      // python 库名，配置 packeageInfo 必填
      "name": "alibabacloud_sdk_py2",
      // 简介，配置 packeageInfo 必填
      "desc": "Alibaba Cloud SDK Library for Python",
      // github 地址，配置 packeageInfo 必填
      "github": "https://github.com/aliyun/alibabacloud-sdk",
      // 包作者
      "author": "Alibaba Cloud SDK",
      // 包作者邮箱
      "email": "sdk-team@alibabacloud.com",
      // 指定依赖，非必填
      "require": ["xxx>=0.0.1, <1.0.0", "xxx>=0.0.1, <1.0.0"]
    }
  },
  "csharp": {
    // 决定 client 文件的文件名与 client 类名，使用大驼峰
    "className": "Client",
    // 生成 C# 代码的 rootNamespace，根命名空间
    // 也是csproj 文件中的 rootNamespace 属性值
    "namespace": "AlibabaCloud.SDK",
    // 决定生成 C# 包信息文件 xxx.csproj 中相关内容
    "packageInfo": {
      //csproj 的项目文件名称，例为: sdk.csproj
      "name": "sdk",
      // 版本号
      "version": "2.0.6",
      // 生成 AssemblyInfo.cs 文件中的 AssemblyTitle 值
      "title": "alibabacloud-sdk",
      // 生成 AssemblyInfo.cs 文件中的 AssemblyDescription 值
      "description": "Alibaba Cloud SDK Library for .NET",
      // 生成 AssemblyInfo.cs 文件中的 AssemblyCompany 值
      "company": "Alibaba Cloud, Inc",
      // 生成 AssemblyInfo.cs 文件中的 AssemblyProduct 值
      "product": "sdk",
      // 生成 AssemblyInfo.cs 文件中的 AssemblyCopyright 值
      "copyRight": "",
      // 生成 AssemblyInfo.cs 文件中的 Guid 值
      "guid": ""
    }
  },
  "php": {
    // PHP 代码的基础命名空间
    "package": "AlibabaCloud.SDK",
    // 决定 client 文件的文件名与 client 类名，使用大驼峰
    "clientName": "SDK",
    // 生成 PHP composer 软件包信息
    "packageInfo": {
      // composer 软件包的名称
      "name": "alibabacloud/sdk",
      // composer 软件包的描述信息
      "desc": "Alibaba Cloud SDK Library for PHP",
      // 代码发布的 github 地址
      "github": "https://github.com/aliyun/alibabacloud-sdk"
    }
  },
  "go": {
    // 额外引用的依赖，非必填
    "package": [
      "io"
    ],
    // 指定是否生成接口 interface
    "interface": true,
    // 文件名固定为 client.go，仅决定 client.go 中的 struct 名称，使用大驼峰
    "clientName": "Client"
  },
  "cpp": {
    "packageInfo": {
      "git": {
        // git 组织名
        "scope": "alibabacloud-sdk-cpp",
        // git 组织下的仓库名
        "project": "dara-openapi"
      }
    }
  }
}
```