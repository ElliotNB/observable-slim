# Observable Slim
https://github.com/elliotnb/observable-slim

Version 0.0.1. Copyright 2017, Elliot B. All rights reserved.

Licensed under the MIT license:

http://www.opensource.org/licenses/MIT

## Overview 
Observable Slim is a singleton that allows you to observe changes made to an object and any nested
children of that object. It is intended to assist with one-way data binding, that is, in MVC parlance, 
reflecting changes in the model to the view. Observable Slim aspires to be as lightweight and easily
understood as possible. Minifies down to roughly 500 characters.

## Usage

```javascript
var test = {};
var p = ObservableSlim.create(test, true, function(changes) {
	console.log(JSON.stringify(changes));
});

p.hello = "world";  		// [{"target":{},"property":"hello","newValue":"world","currentPath":"hello"}]
p.testing = {}; 			// [{"target":{"hello":"world"},"property":"testing","newValue":{},"currentPath":"testing"}]
p.testing.blah = 42;		// [{"target":{},"property":"blah","newValue":42,"currentPath":"testing.blah"}]
p.arr = [];					// [{"target":{"hello":"world","testing":{"blah":42}},"property":"arr","newValue":[],"currentPath":"arr"}]
p.arr.push("splice test");	// [{"target":[],"property":"0","newValue":"splice test","currentPath":"arr"}]
p.arr.push("hello world");	// [{"target":["splice test"],"property":"1","newValue":"hello world","currentPath":"arr"}]
p.arr.splice(0,1);    // [{"target":["splice test","hello world"],"property":"0","newValue":"hello world","previousValue":"splice test","currentPath":"arr"}]
console.log(JSON.stringify(test));			// {"hello":"world","testing":{"blah":42},"arr":["hello world"]}
```

If you wish to add a second observer function to the same object, you may do so as follows:
```javascript
ObservableSlim.observe(p, function(target, property, value, path) {
	console.log("Second function. Change on '"+path+"', new value: " + JSON.stringify(value));
});
```