/*
 * 	Observable Slim
 * 	https://github.com/elliotnb/observable-slim
 *
 * 	Version 0.0.1. Copyright 2017, Elliot B. All rights reserved.
 *
 * 	Licensed under the MIT license:
 * 	http://www.opensource.org/licenses/MIT
 *
 *	Observable Slim is a singleton that allows you to observe changes made to an object and any nested
 *	children of that object. It is intended to assist with one-way data binding, that is, in MVC parlance, 
 *	reflecting changes in the model to the view. Observable Slim aspires to be as lightweight and easily
 *	understood as possible. Minifies down to roughly 500 characters.
 *	Usage:
 *	
 *		var test = {};
 *		var p = ObservableSlim.create(test);
 *
 *		ObservableSlim.observe(p, function(target, property, value, path) {
 *			console.log("Change on '"+path+"', new value: " + JSON.stringify(value));
 *		});
 *		
 *		p.hello = "world";  		// Change on 'hello', new value: "world"
 *		p.testing = {}; 			// Change on 'testing', new value: {}
 *		p.testing.blah = 42;		// Change on 'testing.blah', new value: 42
 *		p.arr = [];					// Change on 'testing.arr', new value: []
 *		p.arr.push("hello world");	// Change on 'testing.arr.0', new value: "hello world"
 *		console.log(test)			// {"hello":"world","testing":{"blah":42},"arr":["hello world"]}
 */
var ObservableSlim = (function() {

	// An array that stores all of the observables created through the public create() method below.
	var observables = [];

	/*	Function: _create
				Private internal function that is invoked to create a new ES6 Proxy whose changes we can observe through 
				the Observerable.observe() method.
			
			Parameters:
				target 				- required, plain JavaScript object that we want to observe for changes.
				domDelay 			- batch up changes on a 10ms delay so a series of changes can be processed in one DOM update.
				originalObservable 	- object, the original observable created by the user, exists for recursion purposes, 
									  allows one observable to observe change on any nested/child objects.
				originalPath 		- string, the path of the property in relation to the target on the original observable, 
									  exists for recursion purposes, allows one observable to observe change on any nested/child objects.
									  
			Returns:
				An ES6 Proxy object.
	*/
	var _create = function(target, domDelay, originalObservable, originalPath) {
		
		var observable = originalObservable || null;
		var path = originalPath || "";
		
		var changes = [];
		
		var handler = { 
			get: function(target, property) {
				// if we are traversing into a new object, then we want to record path to that object and return a new observable.
				// recursively returning a new observable allows us a single Observable.observe() to monitor all changes on 
				// the target object and any objects nested within.
				if (typeof target[property] === "object" && target[property] !== null) {
					var newPath = (path !== "") ? (path + "." + property) : property;
					return _create(target[property], domDelay, observable, newPath);
				} else {
					return target[property];
				}
			},
			set: function(target, property, value, receiver) {

				// only record a change if the new value differs from the old one
				if (target[property] !== value) {
				
					// record the current path of the object property being modified
					if (target instanceof Array) {
						var currentPath = (path !== "") ? (path) : property;
					} else {
						var currentPath = (path !== "") ? (path + "." + property) : property;
					}

					// store the change that just occurred
					changes.push({"target":target,"property":property,"newValue":value,"previousValue":receiver[property],"currentPath":currentPath});
					
					// invoke any functions that are observing changes
					for (var i = 0; i < observable.observers.length; i++) {
						
						// execute handler functions on a 10ms settimeout, this prevents the handler functions from being executed 
						// separately on every change -- this is necessary because the handler functions are often to trigger UI updates
						if (domDelay === true) {
							setTimeout((function(numChanges,i) {
								return function() {
									if (numChanges === changes.length) {
										observable.observers[i](changes);
										changes = [];
									}
								};
							})(changes.length,i),10);
						} else {
							observable.observers[i](changes);
							changes = [];
						}
					}
					
					// because the value actually differs than the previous value
					// we need to store the new value on the original target object
					target[property] = value;
				}
				
				return true;
			}
		}
		
		// create the proxy that we'll use to observe any changes
		var p = new Proxy(target, handler);
		
		// we don't want to create a new observable if this function was invoked recursively
		if (observable === null) observable = {"observable":p, "observers":[]};
		
		observables.push(observable);
		
		return p;
	};
	
	return {
		/*	Method:
				Public method that is invoked to create a new ES6 Proxy whose changes we can observe 
				through the Observerable.observe() method.
			
			Parameters
				target - required, plain JavaScript object that we want to observe for changes.
				domDelay - required, batch up changes on a 10ms delay so a series of changes can be processed in one DOM update.
				handler - optional, this function will be invoked when a change is made to the observable (not to be confused with the handler defined in the create() method).
			
			Returns:
				An ES6 Proxy object.
		*/
		create: function(target, domDelay, handler) {
			var observable = _create(target);
			if (typeof handler === "function") this.observe(observable, handler);
			return observable;
			
		},
		
		/*	Method: observe
				This method
		
			Parameters:
				observable 	- the ES6 Proxy returned by the create() method. We want to observe changes made to this object.
				handler 	- this function will be invoked when a change is made to the observable (not to be confused with the 
							  handler defined in the create() method).
			
			Returns:
				Nothing.
		*/
		observe: function(observable, handler) {
			// loop over all the observables created by the _create() function
			var i = observables.length;
			while (i--) {
				if (observables[i].observable === observable) {
					observables[i].observers.push(handler);
					break;
				}
			};
		}
	};

})();


