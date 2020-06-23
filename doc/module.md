# 模块包

## 介绍

因为对于大多数网关和 SDK 而言逻辑大多是相同可复用的，所以 Darabonba 采用了模块化的设计，每一个 Darabonba 脚本都是一个模块，而模块内部的所有 function、api、model 都可以在编写其他 Darabonba 模块时被引用或继承。

## 简单的模块示例

下面我们通过一起来编写一个简单的示例模块来感受 Darabonba 模块化设计的理念，首先我们先编写一个简单的模块。

### Darafile

被依赖的模块的 Darafile 中需要加入 `releases` 属性，在依赖它的模块编译时才能找到对应语言所需要的包，例如 TypeScript 语言用 ts 属性告知生成器在生成时引入示例模块发布的 npm 包。

```dara
{
  "scope": "darabonba",
  "name": "TestModule",
  "version": "1.0.0",
  "main": "./main.tea",
  "releases": {
    "ts": "@darabonba/test-module:0.0.1"
  }
}
```

### main.dara

模块可以定义初始化函数 `init` 类似 TypeScript 和 Java 语言的 class 中的 `constructor` 函数，也可以通过 `type @name = type` 的方式为模块定制模块属性，该变量可在模块的 init、api、function 中使用，但不可在 static function 中使用。

```dara
// 模块属性
type @organization = string

model User{
  name: string,
  age: number
}

// 模块初始化函数
init(organization: string) {
  @organization = organization;
}

static function getUser(username: string, age: number): string {
  var user = new User{
    name = username,
    age = age
  };
  return `user's name is ${user.name} ,user's age is ${user.age}! `;
} 

function sayUserName(username: string): string {
  // @organization 可以在 function 中使用
  return `user's name is ${username}, user's organization is ${@organization}! `;
}
```

## 引用模块

在成功的创建了我们示例的模块以后，我们将通过下面的示例说明如何引用这个模块。

### Darafile

在引用模块的时候，Darafile 中需要加入 `libraries` 属性来告诉编译器需要哪些模块，否则编译会出错。
```dara
{
  "scope": "darabonba",
  "name": "Sample",
  "version": "1.0.0",
  "main": "./main.tea",
  "libraries": {
    "TestModule": "TestModule的本地引用路径"
  }
}
```

### main.dara

在需要引入模块的 dara 脚本中，我们通过 `import` 关键字将 `libraries` 里定义的模块引入，可以通过 new 关键字得到引入模块的实例来使用模块的 api 和 function，也可以直接引用其中的 model、static function。

```dara
import TestModule;

type @operator = string

init(operator: string) {
  @operator = operator;
  // 初始化 TestModule 模块，执行其中的 init 方法
  var moduleInstance = new TestModule('darabonba');
  // function 和 api 都只能通过模块实例调用。
  var sayName = moduleInstance.sayUserName('test');
}

static function getUserInfo(department: string): string {
  // 实例化 TestModule 模块中的 model
  var basicUserInfo = new TestModule.User{
    name = 'test',
    age = 0
  };
  // 调用 TestModule 模块中的方法
  var basicInfo: string = TestModule.getUser('test', 27);
  return `${basicInfo} he's department is ${department} `;
}
```

## 继承模块

再了解了如何引用模块以后，我们再来通过下面示例说明如何继承这个模块。Darafile 跟之前保持一致，只需要修改 dara 文件即可。

### main.dara

在需要引入模块的 dara 脚本中，我们同样通过 `import` 关键字模块引入，然后通过 `extends` 关键字继承父模块，在模块初始化函数 `init` 中通过 `super` 实例化父模块，就可以直接引用其中的 function、api，**而 model 和 static function 的引用方式跟引用模块时一致**。

```dara
import TestModule;

extends TestModule;

type @operator = string

init(organization: string, operator: string) { 
  // 调用父模块的 init 方法
  super(organization);
  @operator = operator;
}

static function getSubUserInfo(department: string): string {
  // 实例化父模块中的 model 和引用时一样
  var basicUserInfo = new TestModule.User{
    name = 'test',
    age = 0
  };
  // 调用父模块中的 static function 和引用时一样
  var basicInfo: string = TestModule.getUser('test', 27);
  // 直接调用父模块中的 function 和 api 
  var sayName:string = sayUserName('test');
  return `${basicInfo} he's department is ${department} `;
}
```