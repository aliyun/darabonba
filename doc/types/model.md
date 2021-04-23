# 自定义类型 `Model`

## 介绍

在 `Darabonba` 中，我们通过 `Model` 来表示属性可枚举的对象结构，可以将其翻译为一个确切的类型，比如在 `Java`、`TypeScript` 中可以翻译为 `class`，在 `Go` 中可以翻译为 `struct`。通过该类型可以为我们的 `function` 和 `api` 提供准确的入参和出参类型。`Model` 通过 `model modelName { key: valueType }` 的方式定义，`valueType` 可以为基础类型、复杂类型及 `Model`。

```js
model Simple {
  name: string,
  age: number
}

model Complex {
  // 数组类型
  arr: [ string ],
  // Map 类型
  collection: map[string]string,
  // Model 类型
  otherModel: Simple,
  // object 类型
  obj: object,
  // any 类型
  key: any
}
```

## 匿名 `Model`

`Model` 的 `valueType` 中不仅可以使用已经定义好的 `Model`，还能直接在 `valueType` 处定义匿名 `Model` 使用。

```js
model Complex {
  arr: [ string ],
  // 通过匿名 Model 指定字段类型
  subModel: {
    username: string,
    age: number
  }
}
```

## Model 初始化

`Model` 的使用类似于 `Java`、`TypeScript` 中的 `class`，通过关键字 `new` 来得到 `Model` 的实例。

```js
model User {
  username: string,
  age: number
}

model Complex {
  arr: [ string ],
  otherModel: User,
  subModel: {
    username: string,
    age: number
  }
}

// 模块的初始化函数
init() {
  var user = new User{
    username = 'page',
    age = 18
  };

  var subModel = new Complex.subModel{
    username = user.username,
    age = user.age
  };

  var complex = new Complex{
    arr = [ 'page' ],
    otherModel = user,
    subModel = new Complex.subModel{
      username = user.username,
      age = user.age
    }
  };
}
```

## Model 的字段描述

通过字段的描述，可以更好的约束字段的行为，如限制最大值或最小值等，还能为字段的使用提供简单的介绍和说明。

目前支持的描述关键字:

- maximum :
  - 限制字段的`最大值`，只能用于数字类型的字段。
- minimum :
  - 限制字段的`最小值`，只能用于数字类型的字段。
- maxLength :
  - 限制字段的`最大长度`，可以用于字符串、数组类型的字段。
- minLength :
  - 限制字段的`最小长度`，可以用于字符串、数组类型的字段。
- pattern :
  - 字符串的正则匹配规则，只能用于字符串类型的字段。
- description :
  - 字段的描述信息。
- example :
  - 字段的使用示例。
- default :
  - 字段的默认值。

使用示例

```js
model User {
  username: string(
    description="登陆账号",
    example="johny",
    maxLength=32,
    minLength=5,
    pattern="[a-z0-9A-Z]+"
  ),
  age: number(
    description="年龄",
    example="18",
    maximum=150,
    minimum=0,
    default=18
  )
}
```
