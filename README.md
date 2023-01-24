# :eyes: Observable Slim

[![Build Status](https://app.travis-ci.com/ElliotNB/observable-slim.svg?branch=master)](https://app.travis-ci.com/ElliotNB/observable-slim) [![Coverage Status](https://coveralls.io/repos/github/ElliotNB/observable-slim/badge.svg)](https://coveralls.io/github/ElliotNB/observable-slim) [![Monthly Downloads](https://img.shields.io/npm/dm/observable-slim.svg)](https://www.npmjs.com/package/observable-slim)

https://github.com/elliotnb/observable-slim

Version 0.1.6

Licensed under the MIT license:

http://www.opensource.org/licenses/MIT

## Overview
Observable Slim is a singleton that utilizes ES6 Proxies to observe changes made to an object and any nested children of that object. Observable Slim aspires to be as highly performant and lightweight as possible. Minifies down to 5KB.

Observable Slim was originally built as part of the **[Nimbly](https://github.com/elliotnb/nimbly)** JS framework where it assisted with state management, state mutation triggers and one-way data binding. Observerable Slim was separated out from Nimbly in order to service other use cases outside of the scope of the **[Nimbly](https://github.com/elliotnb/nimbly)** framework.

## Install

```html
<script src="observable-slim.js"></script>
```

Also available via NPM:

```
$ npm install observable-slim --save
```

## Usage

### Create an observer

The `create` method is the starting point for using Observable Slim. It is invoked to create a new ES6 `Proxy` whose changes we can observe. The `create` method accepts three parameters:

1. `target` (`object`, *required*): plain object that we want to observe for changes.
2. `domDelay` (`boolean|number`, *required*): if `true`, then the observed changes to `target` will be batched up on a 10ms delay (via `setTimeout()`). If `false`, then the `observer` function will be immediately invoked after each individual change made to `target`. It is helpful to set `domDelay` to `true` when your `observer` function makes DOM manipulations (fewer DOM redraws means better performance). If a number greater than zero, then it defines the DOM delay in milliseconds.
3. `observer` (`function(ObservableSlimChange[])`, *optional*): function that will be invoked when a change is made to the proxy of `target`. When invoked, this function is passed a single argument: an array of `ObservableSlimChange` detailing each change that has been made. The `ObservableSlimChange` object structure is like below:
	- `type` (`"add"|"update"|"delete"`, *required*): change type.
	- `property` (`string`, *required*): property name.
	- `currentPath` (`string`, *required*): property path with the dot notation (e.g. `foo.0.bar`).
	- `jsonPointer` (`string`, *required*): property path with the JSON pointer syntax (e.g. `/foo/0/bar`). See [RFC 6901](https://datatracker.ietf.org/doc/html/rfc6901).
	- `target` (`object`, *required*): target object.
	- `proxy` (`Proxy`, *required*): proxy of the target object.
	- `newValue` (`*`, *required*): new value of the property.
	- `previousValue` (`*`, *optional*): previous value of the property.

The `create` method will return a standard ES6 `Proxy`.

```javascript
var test = {};
var p = ObservableSlim.create(test, true, function(changes) {
	console.log(JSON.stringify(changes));
});

p.hello = "world";
// Console log:
// [{"type":"add","target":{"hello":"world"},"property":"hello","newValue":"world","currentPath":"hello","jsonPointer":"/hello","proxy":{"hello":"world"}}]

p.hello = "WORLD";
// Console log:
// [{"type":"update","target":{"hello":"WORLD"},"property":"hello","newValue":"WORLD","previousValue":"world","currentPath":"hello","jsonPointer":"/hello","proxy":{"hello":"WORLD"}}]

p.testing = {};
// Console log:
// [{"type":"add","target":{"hello":"WORLD","testing":{}},"property":"testing","newValue":{},"currentPath":"testing","jsonPointer":"/testing","proxy":{"hello":"WORLD","testing":{}}}]

p.testing.blah = 42;
// Console log:
// [{"type":"add","target":{"blah":42},"property":"blah","newValue":42,"currentPath":"testing.blah","jsonPointer":"/testing/blah","proxy":{"blah":42}}]

p.arr = [];
// Console log:
// [{"type":"add","target":{"hello":"WORLD","testing":{"blah":42},"arr":[]},"property":"arr","newValue":[],"currentPath":"arr","jsonPointer":"/arr","proxy":{"hello":"WORLD","testing":{"blah":42},"arr":[]}}]

p.arr.push("hello world");
// Console log:
// [{"type":"add","target":["hello world"],"property":"0","newValue":"hello world","currentPath":"arr.0","jsonPointer":"/arr/0","proxy":["hello world"]}]

delete p.hello;
// Console log:
// [{"type":"delete","target":{"testing":{"blah":42},"arr":["hello world"]},"property":"hello","newValue":null,"previousValue":"WORLD","currentPath":"hello","jsonPointer":"/hello","proxy":{"testing":{"blah":42},"arr":["hello world"]}}]

p.arr.splice(0,1);
// Console log:
// [{"type":"delete","target":[],"property":"0","newValue":null,"previousValue":"hello world","currentPath":"arr.0","jsonPointer":"/arr/0","proxy":[]},
// {"type":"update","target":[],"property":"length","newValue":0,"previousValue":1,"currentPath":"arr.length","jsonPointer":"/arr/length","proxy":[]}]

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

### Pause changes

If you wish to pause changes to the target data without pausing the execution of the observer functions, you may do so as follows:
```javascript
ObservableSlim.pauseChanges(proxy);
```

### Resume changes

While an observable has changes paused, all observer functions will be invoked, but the target object will not be modified.

To resume changes:

```javascript
ObservableSlim.resumeChanges(proxy);
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

**Note:** This functionality is not supported by the ES5 Proxy polyfill.

### Retrieve the path of an object relative to the top-level observer

ObservablesSlim also allows you to retrieve the full path of an object relative to the top-level observed object:

```javascript
var data = {"foo":"bar","arr":[{"test":{}}],"test":{"deeper":{}}};
var p = ObservableSlim.create(data, false, function(changes) {});

console.log(p.test.deeper.__getPath); // logs "test.deeper"

```

**Note:** This functionality is not supported by the ES5 Proxy polyfill.

## Requirements

For full functionality, Observable Slim requires [ES6 `Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

As of August 2017, ES6 `Proxy` is supported by Chrome 49+, Edge 12+, Firefox 18+, Opera 36+ and Safari 10+. Internet Explorer does not support ES6 `Proxy`.

#### Limitations ####

Because the Proxy polyfill does not (and will never) fully emulate native ES6 `Proxy`, there are certain use cases that will not work when using Observable Slim with the Proxy polyfill:

1. Object properties must be known at creation time. New properties cannot be added later.
2. Modifications to `.length` cannot be observed.
3. Array re-sizing via a `.length` modification cannot be observed.
4. Property deletions (e.g., `delete proxy.property;`) cannot be observed.

Array mutations **can** be observed through the use of the array mutation methods listed above.

## Contributing

Contributions are most welcome!

Please be sure to run the commands below against your code before submitting a pull request:
- `npm run test`: run unit tests.
- `npm run type`: generate the `d.ts` file for TypeScript declarations.
- `npm run lint`: analyze the code to quickly find problems.
- `npm run lint:fix`: fix the problems potentially fixable detected by `npm run lint`.
