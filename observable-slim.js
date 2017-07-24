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
			deleteProperty: function(target, property) {
				
				// in order to report what the previous value was, we must make a copy of it before it is deleted
				var previousValue = Object.assign({}, target);
 
				// get the path of the property being deleted
				var currentPath = this._getPath(target, property);
				
				// record the deletion that just took place
				changes.push({"type":"delete","target":target,"property":property,"newValue":null,"previousValue":previousValue[property],"currentPath":currentPath});
				
				// perform the delete that we've trapped
				delete target[property];
				
				this._notifyObservers(changes.length);
				
				return true;
				
			},
			set: function(target, property, value, receiver) {

				// only record a change if the new value differs from the old one
				if (target[property] !== value) {
				
					// get the path of the object property being modified
					var currentPath = this._getPath(target, property);
					
					// determine if we're adding something new or modifying somethat that already existed
					var type = "update";
					if (typeof receiver[property] === "undefined") type = "add";
					
					// store the change that just occurred
					changes.push({"type":type,"target":target,"property":property,"newValue":value,"previousValue":receiver[property],"currentPath":currentPath});
					
					// because the value actually differs than the previous value
					// we need to store the new value on the original target object
					target[property] = value;
					
					this._notifyObservers(changes.length);
					
				}
				
				return true;
			},
			_getPath: function(target, property) {
				if (target instanceof Array) {
					return (path !== "") ? (path) : property;
				} else {
					return (path !== "") ? (path + "." + property) : property;
				}
			},
			_notifyObservers: function(numChanges) {
			
				// execute observer functions on a 10ms settimeout, this prevents the observer functions from being executed 
				// separately on every change -- this is necessary because the observer functions will often trigger UI updates
				if (domDelay === true) {
					setTimeout(function() {
						if (numChanges === changes.length) {
							// invoke any functions that are observing changes
							for (var i = 0; i < observable.observers.length; i++) observable.observers[i](changes);
							changes = [];
						}
					},10);
				} else {
					// invoke any functions that are observing changes
					for (var i = 0; i < observable.observers.length; i++) observable.observers[i](changes);
					changes = [];
				}
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
			var observable = _create(target, domDelay);
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