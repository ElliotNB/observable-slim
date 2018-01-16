/*
 * 	Observable Slim
 *	Version 0.0.1
 * 	https://github.com/elliotnb/observable-slim
 *
 * 	Licensed under the MIT license:
 * 	http://www.opensource.org/licenses/MIT
 *
 *	Observable Slim is a singleton that allows you to observe changes made to an object and any nested
 *	children of that object. It is intended to assist with one-way data binding, that is, in MVC parlance, 
 *	reflecting changes in the model to the view. Observable Slim aspires to be as lightweight and easily
 *	understood as possible. Minifies down to roughly 1500 characters.
 *	Usage:
 *	
 *		var test = {};
 *		var p = ObservableSlim.create(test, true, function(changes) {
 *			console.log(JSON.stringify(changes));
 *		});
 *		
 *		p.hello = "world";  		// [{"type":"add","target":{"hello":"world"},"property":"hello","newValue":"world","currentPath":"hello"}]
 *		p.testing = {}; 			// [{"type":"add","target":{"hello":"world","testing":{}},"property":"testing","newValue":{},"currentPath":"testing"}]
 *		p.testing.blah = 42;		// [{"type":"add","target":{"blah":42},"property":"blah","newValue":42,"currentPath":"testing.blah"}]
 *		p.arr = [];					// [{"type":"add","target":{"hello":"world","testing":{"blah":42},"arr":[]},"property":"arr","newValue":[],"currentPath":"arr"}]
 *		p.arr.push("hello world");	// [{"type":"add","target":["hello world"],"property":"0","newValue":"hello world","currentPath":"arr"}]
 *		console.log(test);			// {"hello":"world","testing":{"blah":42},"arr":["hello world"]}
 *		delete p.hello;				// [{"type":"delete","target":{"testing":{"blah":42},"arr":["hello world"]},"property":"hello","newValue":null,"previousValue":"world","currentPath":"hello"}]
 *		p.arr.splice(0,1);			// [{"type":"delete","target":[],"property":"0","newValue":null,"previousValue":"hello world","currentPath":"arr"},{"type":"update","target":[],"property":"length","newValue":0,"previousValue":1,"currentPath":"arr"}]
 *		console.log(test);			// {"testing":{"blah":42},"arr":[]}
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
		
		var _getPath = function(target, property) {
			if (target instanceof Array) {
				return (path !== "") ? (path) : property;
			} else {
				return (path !== "") ? (path + "." + property) : property;
			}
		};
		
		var _notifyObservers = function(numChanges) {
			
			// if the observable is paused, then we don't want to execute any of the observer functions
			if (observable.paused === true) return;
					
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
		};
		
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
				var currentPath = _getPath(target, property);
				
				// record the deletion that just took place
				changes.push({"type":"delete","target":target,"property":property,"newValue":null,"previousValue":previousValue[property],"currentPath":currentPath});
				
				// perform the delete that we've trapped
				delete target[property];
				
				_notifyObservers(changes.length);
				
				return true;
				
			},
			set: function(target, property, value, receiver) {

				// only record a change if the new value differs from the old one
				if (target[property] !== value) {
				
					// get the path of the object property being modified
					var currentPath = _getPath(target, property);
					
					// determine if we're adding something new or modifying somethat that already existed
					var type = "update";
					if (typeof receiver[property] === "undefined") type = "add";
					
					// store the change that just occurred
					changes.push({"type":type,"target":target,"property":property,"newValue":value,"previousValue":receiver[property],"currentPath":currentPath});
					
					// because the value actually differs than the previous value
					// we need to store the new value on the original target object
					target[property] = value;
					
					_notifyObservers(changes.length);
					
				}
				
				return true;
			}
			
		}
		
		// create the proxy that we'll use to observe any changes
		var proxy = new Proxy(target, handler);
		
		// we don't want to create a new observable if this function was invoked recursively
		if (observable === null) {
			observable = {"target":target, "domDelay":domDelay, "proxy":proxy, "observers":[],"paused":false,"path":path};
			observables.push(observable);
		}

		return proxy;
	};
	
	return {
		/*	Method:
				Public method that is invoked to create a new ES6 Proxy whose changes we can observe 
				through the Observerable.observe() method.
			
			Parameters
				target - required, plain JavaScript object that we want to observe for changes.
				domDelay - required, batch up changes on a 10ms delay so a series of changes can be processed in one DOM update.
				callback - optional, this function will be invoked when a change is made to the proxy
			
			Returns:
				An ES6 Proxy object.
		*/
		create: function(target, domDelay, callback) {
			
			// first determine if we already have a proxy for the given target
			var i = observables.length;
			while (i--) {
				// if we find a match, then we add the callback function to the array of observers for this observable
				if (target === observables[i].target && domDelay === observables[i].domDelay) {
					observables[i].observers.push(callback);
					return observables[i].proxy;
				}
			};
			
			var proxy = _create(target, domDelay);
			if (typeof callback === "function") this.observe(proxy, callback);
			return proxy;
			
		},
		
		/*	Method: observe
				This method is used to add a new observer function to an existing proxy.
		
			Parameters:
				proxy 	- the ES6 Proxy returned by the create() method. We want to observe changes made to this object.
				callback 	- this function will be invoked when a change is made to the observable (not to be confused with the 
							  callback defined in the create() method).
			
			Returns:
				Nothing.
		*/
		observe: function(proxy, callback) {
			// loop over all the observables created by the _create() function
			var i = observables.length;
			while (i--) {
				if (observables[i].proxy === proxy) {
					observables[i].observers.push(callback);
					break;
				}
			};
		},
		
		/*	Method: pause
				This method will prevent any observer functions from being invoked when a change occurs to a proxy.
			
			Parameters:
				proxy 	- the ES6 Proxy returned by the create() method.
		*/
		pause: function(proxy) {
			var i = observables.length;
			while (i--) {
				if (observables[i].proxy === proxy) {
					observables[i].paused = true;
					break;
				}
			};
		},
		
		/*	Method: resume
				This method will resume execution of any observer functions when a change is made to a proxy.
			
			Parameters:
				proxy 	- the ES6 Proxy returned by the create() method.
		*/
		resume: function(proxy) {
			var i = observables.length;
			while (i--) {
				if (observables[i].proxy === proxy) {
					observables[i].paused = false;
					break;
				}
			};
		}
		
	};

})();