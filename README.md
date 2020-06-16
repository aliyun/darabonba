# Darabonba(原名 TeaDSL)

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![codecov][cov-image]][cov-url]
[![David deps][david-image]][david-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@darabonba/parser.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@darabonba/parser
[travis-image]: https://img.shields.io/travis/aliyun/darabonba.svg?style=flat-square
[travis-url]: https://travis-ci.org/aliyun/darabonba
[cov-image]: https://codecov.io/gh/aliyun/darabonba/branch/master/graph/badge.svg
[cov-url]: https://codecov.io/gh/aliyun/darabonba
[david-image]: https://img.shields.io/david/aliyun/darabonba.svg?style=flat-square
[david-url]: https://david-dm.org/aliyun/darabonba
[download-image]: https://img.shields.io/npm/dm/@darabonba/parser.svg?style=flat-square
[download-url]: https://npmjs.org/package/@darabonba/parser

一种 OpenAPI 应用的领域特定语言。可以利用它为任意风格的接口生成多语言的 SDK、代码示例、测试用例、接口编排等

## 组件

- 解析器（当前模块）
- 生成器（陆续开源中）
    - [Java](https://github.com/aliyun/darabonba-java-generator)
    - [C#](https://github.com/aliyun/darabonba-csharp-generator)
    - [TypeScript](https://github.com/aliyun/darabonba-typescript-generator)
    - [PHP](https://github.com/aliyun/darabonba-php-generator)
    - [Golang](https://github.com/aliyun/darabonba-go-generator)
    - [Python](https://github.com/aliyun/darabonba-python-generator)
    - Swift
    - Dart
    - Ruby
    - Lua
    - Kotlin
    - C++
- [VS Code 插件](https://github.com/aliyun/darabonba-vscode)：提供语法高亮、代码提示、代码格式化、语法检查
- [CLI](https://github.com/aliyun/darabonba-cli)：命令行工具

## 文档

- 数据类型
    - 基本类型
    - 复合类型
    - 模型（Model）
- 模块包
- API & Function
- 语言规范

## 概念

![Darabonba 概念图](./fixtures/concept.svg)

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
