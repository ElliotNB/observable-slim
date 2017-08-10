# Observable Slim
https://github.com/elliotnb/observable-slim

Version 0.0.1.

Licensed under the MIT license:

http://www.opensource.org/licenses/MIT

## Overview 
Observable Slim is a singleton that allows you to observe changes made to an object and any nested
children of that object. It is intended to assist with one-way data binding, that is, in MVC parlance, 
reflecting changes in the model to the view. Observable Slim aspires to be as lightweight and easily
understood as possible. Minifies down to roughly 1500 characters.

## Usage

```javascript
var test = {};
var p = ObservableSlim.create(test, true, function(changes) {
	console.log(JSON.stringify(changes));
});

p.hello = "world";   // [{"type":"add","target":{"hello":"world"},"property":"hello","newValue":"world","currentPath":"hello"}]
p.testing = {};   // [{"type":"add","target":{"hello":"world","testing":{}},"property":"testing","newValue":{},"currentPath":"testing"}]
p.testing.blah = 42;   // [{"type":"add","target":{"blah":42},"property":"blah","newValue":42,"currentPath":"testing.blah"}]
p.arr = [];   // [{"type":"add","target":{"hello":"world","testing":{"blah":42},"arr":[]},"property":"arr","newValue":[],"currentPath":"arr"}]
p.arr.push("hello world");   // [{"type":"add","target":["hello world"],"property":"0","newValue":"hello world","currentPath":"arr"}]
console.log(test);   // {"hello":"world","testing":{"blah":42},"arr":["hello world"]}
delete p.hello;   // [{"type":"delete","target":{"testing":{"blah":42},"arr":["hello world"]},"property":"hello","newValue":null,"previousValue":"world","currentPath":"hello"}]
p.arr.splice(0,1);   // [{"type":"delete","target":[],"property":"0","newValue":null,"previousValue":"hello world","currentPath":"arr"},{"type":"update","target":[],"property":"length","newValue":0,"previousValue":1,"currentPath":"arr"}]
console.log(test);   // {"testing":{"blah":42},"arr":[]}
```

If you wish to add a second observer function to the same object, you may do so as follows:
```javascript
ObservableSlim.observe(p, function(changes) {
	console.log(changes);
});
```

If you wish to pause the execution of observer functions, you may do so as follows:
```javascript
var test = {};
var p = ObservableSlim.create(test, true, function(changes) {
	console.log(JSON.stringify(changes));
});
ObservableSlim.pause(p);
```

While an observable is paused, no observer functions will be invoked when the target object is modified.

To resume the execution of observer functions:

```javascript
ObservableSlim.resume(p);
```

## Requirements

Observable Slim requires [ES6 Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

As of August 2017, ES6 Proxy is supported by Chrome 49+, Edge 12+, Firefox 18+, Opera 36+ and Safari 10+. Internet Explorer does not support ES6 Proxy. Additionally, there are no polyfills that fully replicate ES6 Proxy functionality in older browsers.