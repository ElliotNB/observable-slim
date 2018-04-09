[![Build Status](https://travis-ci.org/ElliotNB/observable-slim.svg?branch=master)](https://travis-ci.org/ElliotNB/observable-slim)

# Observable Slim
https://github.com/elliotnb/observable-slim

Version 0.0.2.

Licensed under the MIT license:

http://www.opensource.org/licenses/MIT

## Overview 
Observable Slim is a singleton that utilizes ES6 Proxies to observe changes made to an object 
and any nested children of that object. It is intended to assist with state management and one-way 
data binding. Observable Slim aspires to be as lightweight and simple as possible. Minifies 
down to roughly 3000 characters.

## Usage


### Create an observer

The `create` method is the starting point for using Observable Slim. It is invoked to create a new ES6 Proxy 
whose changes we can observe. The `create` method accepts three parameters:

1. `target` - Object, required, plain JavaScript object that we want to observe for changes.
2. `domDelay` - Boolean, required, if true, then Observable Slim will batch up observed changes to `target` on a 10ms delay (via `setTimeout`). If false, then `observer` will be immediately invoked after each individual change made to `target`. It is helpful to set `domDelay` to `true` when your `observer` function makes DOM manipulations (fewer DOM redraws means better performance).
3. `observer` - Function, optional, will be invoked when a change is made to the proxy of `target`. When invoked, the `observer` function is passed a single argument -- an array detailing each change that has been made (see below).

The `create` method will return a standard ES6 Proxy.

```javascript
var test = {};
var p = ObservableSlim.create(test, true, function(changes) {
	console.log(JSON.stringify(changes));
});

p.hello = "world";   
// Console log:
// [{"type":"add","target":{"hello":"world"},"property":"hello","newValue":"world","currentPath":"hello","proxy":{"hello":"world"}}]

p.hello = "WORLD";
// Console log:
// [{"type":"update","target":{"hello":"WORLD"},"property":"hello","newValue":"WORLD","previousValue":"world","currentPath":"hello","proxy":{"hello":"WORLD"}}]

p.testing = {};   
// Console log:
// [{"type":"add","target":{"hello":"WORLD","testing":{}},"property":"testing","newValue":{},"currentPath":"testing","proxy":{"hello":"WORLD","testing":{}}}]

p.testing.blah = 42;   
// Console log:
// [{"type":"add","target":{"blah":42},"property":"blah","newValue":42,"currentPath":"testing.blah","proxy":{"blah":42}}]

p.arr = [];   
// Console log:
// [{"type":"add","target":{"hello":"WORLD","testing":{"blah":42},"arr":[]},"property":"arr","newValue":[],"currentPath":"arr","proxy":{"hello":"WORLD","testing":{"blah":42},"arr":[]}}]

p.arr.push("hello world");   
// Console log:
// [{"type":"add","target":["hello world"],"property":"0","newValue":"hello world","currentPath":"arr","proxy":["hello world"]}]

delete p.hello;  
// Console log:
// [{"type":"delete","target":{"testing":{"blah":42},"arr":["hello world"]},"property":"hello","newValue":null,"previousValue":"WORLD","currentPath":"hello","proxy":{"testing":{"blah":42},"arr":["hello world"]}}]

p.arr.splice(0,1);   
// Console log:
// [{"type":"delete","target":[null],"property":"0","newValue":null,"previousValue":"hello world","currentPath":"arr","proxy":[null]},
//	{"type":"update","target":[],"property":"length","newValue":0,"previousValue":1,"currentPath":"arr","proxy":[]}]

console.log(JSON.stringify(test));   
// Console log:
// {"testing":{"blah":42},"arr":[]}

```

### Nested objects

If you wish to observe changes on a parent object and observe changes to an object nested on the parent, you may do so as follows:
```javascript
var data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":"tree"};

var p = ObservableSlim.create(data, true, function(changes) { console.log("First observable");console.log(changes); });
var pp = ObservableSlim.create(data.testing, true, function(changes) { console.log("Second observable");console.log(changes); });
var ppp = ObservableSlim.create(data.testing.test, true, function(changes) { console.log("Third observable");console.log(changes); });
```

- A change to `ppp.testb` will trigger the callback on all three observables. 
- A change to `p.testing.test.testb` will also trigger the callback on all three observables.
- A change to `pp.testc` will only trigger the first and second observable.
- A change to `p.blah` will only trigger the first observable.

### Add observers

If you wish to add a second observer function to the same object, you may do so as follows:
```javascript

// First, create the observable
var test = {};
var proxy = ObservableSlim.create(test, true, function(changes) {
	console.log(JSON.stringify(changes));
});

// Add a new observer function
ObservableSlim.observe(proxy, function(changes) {
	console.log(changes);
});
```

### Pause observers

If you wish to pause the execution of observer functions, you may do so as follows:
```javascript
ObservableSlim.pause(proxy);
```

### Resume observers

While an observable is paused, no observer functions will be invoked when the target object is modified.

To resume the execution of observer functions:

```javascript
ObservableSlim.resume(proxy);
```

### Remove an observable

When you no longer need to use an observable or monitor the object that it targets, you may remove the observable as follows:

```javascript
ObservableSlim.remove(proxy);
```

## Special features

### Proxy check

When using ObservableSlim, you can quickly determine whether or not an object is a proxy by checking the `__isProxy` property:

```javascript
var test = {"hello":"world"};
var proxy = ObservableSlim.create(test, true, function(changes) {
	console.log(JSON.stringify(changes));
});

console.log(proxy.__isProxy); // returns true
console.log(test.__isProxy); // undefined property
```

### Look up the original proxied target object

ObservableSlim allows you to easily fetch a reference to the original object behind a given proxy using the `__getTarget` property:

```javascript

var test = {"hello":{"foo":{"bar":"world"}}};
var proxy = ObservableSlim.create(test, true, function(changes) {});

console.log(proxy.__getTarget === test); // returns true

```

### Look up a parent object from a child object

ObservableSlim allows you to traverse up from a child object and access the parent object:

```javascript

var test = {"hello":{"foo":{"bar":"world"}}};
var proxy = ObservableSlim.create(test, true, function(changes) {
	console.log(JSON.stringify(changes));
});

function traverseUp(childObj) {
	console.log(JSON.stringify(childObj.__getParent())); // prints out test.hello: {"foo":{"bar":"world"}}
	console.log(childObj.__getParent(2)); // attempts to traverse up two levels, returns undefined because test.hello does not have a parent object
};

traverseUp(proxy.hello.foo);
```


## Requirements

For full functionality, Observable Slim requires [ES6 Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

As of August 2017, ES6 Proxy is supported by Chrome 49+, Edge 12+, Firefox 18+, Opera 36+ and Safari 10+. Internet Explorer does not support ES6 Proxy.

### ES5 Proxy polyfill (IE11 support) ###

ObservableSlim now offers limited support for ES5 browsers or browsers without native Proxy (most motably IE11) through the integration of a forked version of the [Google Chrome Proxy polyfill](https://github.com/GoogleChrome/proxy-polyfill).

The forked version of the Proxy polyfill (contained within this repo) differs from the original Polyfill by adding support for the array mutation methods: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, and `reverse`.

#### Limitations ####

Because the Proxy polyfill does not (and will never) fully emulate native ES6 Proxy, there are certain use cases that will not work when using Observable Slim with the Proxy polyfill:

1. Object properties must be known at creation time. New properties cannot be added later.
2. Modifications to `.length` cannot be observed.
3. Array re-sizing via a `.length` modification cannot be observed.
4. Property deletions (e.g., `delete proxy.property;`) cannot be observed.

Array mutations **can** be observed through the use of the array mutation methods listed above.



