# Darabonba(原名 TeaDSL)

一种 OpenAPI 应用的领域特定语言。可以利用它为任意风格的接口生成多语言的 SDK、代码示例、测试用例、接口编排等

## 组件

- 解析器
- 生成器

## 安装

```sh
$ npm install @darabonba/cli -g
```

该命令执行后会具有一个 `dara` 命令。

使用方法：

```sh
$ dara

The CLI for Darabonba 1.0.0

Usage:

    dara <command> [<args>]

Available commands:

start a Darabonba project
    init          initialization package information

working on the Darabonba project
    check         syntax check for tea file
    serve         start local server for browsing & debugging
    codegen       generate codes
    test          run tests
    exec          execute the static main method of module
    install       install the dependencies from repository
    info          get the info of a tea scope or pakcage
    clean         clean the libraries folder
    build         build ast file for tea file
    format        format the tea source file
    config        view or update configuration

working with Tea Repository(as maintainer)
    pack          pack the project as a *.tgz file
    login         add user or login to repository
    publish       publish the tea package to repository
    unpublish     unpublish the publish module
    maintainer    manage the maintainer of a scope or a tea package
    scope         add a scope
    score         get tea package score

help commands
    help          print the help information

```

## 快速上手

创建一个模块。假设该模块为 hello。创建一个目录：

```sh
$ mkdir hello
$ cd hello
```

初始化模块：

```sh
$ dara init
package scope: mycompany
package name: hello
package version: 1.0.0
main entry: ./hello.tea
```

完成初始化后，会初始化 2 个文件，即包描述文件和入口文件。

```sh
$ ls
Teafile         hello.tea
```

## 许可证
Apache-2.0

Copyright (c) 2009-present, Alibaba Cloud All rights reserved.
