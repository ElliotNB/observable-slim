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
var p = ObservableSlim.create(test, function(target, property, value, path) {
	console.log("Change on '"+path+"', new value: " + JSON.stringify(value));
});

p.hello = "world";  		// Change on 'hello', new value: "world"
p.testing = {}; 			// Change on 'testing', new value: {}
p.testing.blah = 42;		// Change on 'testing.blah', new value: 42
p.arr = [];					// Change on 'testing.arr', new value: []
p.arr.push("hello world");	// Change on 'testing.arr.0', new value: "hello world"
console.log(test)			// {"hello":"world","testing":{"blah":42},"arr":["hello world"]}
```

If you wish to add a second observer function to the same object, you may do so as follows:
```javascript
ObservableSlim.observe(p, function(target, property, value, path) {
	console.log("Second function. Change on '"+path+"', new value: " + JSON.stringify(value));
});
```