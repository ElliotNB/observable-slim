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
 *	understood as possible. Minifies down to roughly 3000 characters.
 */


var ObservableSlim = (function() {
	
	// An array that stores all of the observables created through the public create() method below.
	var observables = [];
	// An array of all the objects that we have assigned Proxies to
	var targets = [];

	// An array of arrays containing the Proxies created for each target object. targetsProxy is index-matched with 
	// 'targets' -- together, the pair offer a Hash table where the key is not a string nor number, but the actual target object
	var targetsProxy = [];
	
	var observableCache = [];
	var originalObservableCache = null;
	
	// this variable tracks duplicate proxies assigned to the same target.
	// the 'set' handler below will trigger the same change on all other Proxies tracking the same target.
	// however, in order to avoid an infinite loop of Proxies triggering and re-triggering one another, we use dupProxy
	// to track that a given Proxy was modified from the 'set' handler
	var dupProxy = null;

	var _getProperty = function(obj, path) {
		return path.split('.').reduce(function(prev, curr) {
			return prev ? prev[curr] : undefined
		}, obj || self)
	};
	
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
				
				// implement a simple check for whether or not the object is a proxy, this helps the .create() method avoid
				// creating Proxies of Proxies.
				if (property === "__isProxy") {
					return true;
				} else if (property === "__getTarget") {
					return target;
				// from the perspective of a given observable on a parent object, return the parent object of the given nested object
				} else if (property === "__getParent") {
					return function(i) {
						if (typeof i === "undefined") var i = 1;
						var parentPath = _getPath(target, "__getParent").split(".");
						parentPath.splice(-(i+1),(i+1));
						return _getProperty(observable.proxy, parentPath.join("."));
					}
				}
				
				// for performance improvements, we assign this to a variable so we do not have to lookup the property value again
				var targetProp = target[property];
				
				// the logic and need behind this next block of code is a little complicated... we want to support multiple observables on the same target object
				// and if the target object is modified via one Proxy, then we want *all* observables to be notified of that change -- including on all nested
				// objects of the original target object. in order to do that, we must create proxies recursively the entire nested target object. we used to complete
				// that recursive initalization in the public 'create' method, but we found that it was too taxing for very large deeply nested objects on older browsers
				// like IE11. this section of code now adds the new proxies on nested objects as soon as they are accessed and for *all* other observables that are monitoring
				// the same object
				
				// mark that the current observable has already 'accessed' this property
				observableCache.push(observable);
				
				// if this is the first observable to access the property, then mark this observable as the initiator
				if (originalObservableCache === null) {
					originalObservableCache = observable;
				
					// loop over all other observables that are observing this same object
					var a = targets.indexOf(target);
					var targetProxyList = targetsProxy[a];
					var b = targetProxyList.length;
					if (b > 1) {
						while (b--) {
							// if the other observable watching this same target has not yet accessed this property, then proceed to...
							if (observableCache.indexOf(targetProxyList[b].observable) === -1) {
								// ...access the same property on the other proxies, this will trigger the 'get' method which will 
								// create a new proxy for the object we've just accessed
								targetProxyList[b].proxy[property];
							}
						}
					}
					
					// once we've fully exited out of the recursive 'get' calls and we're back to the original observable that accessed
					// target[property] then we can reset the observable cache and original observable back to empty
					originalObservableCache = null;
					observableCache = [];
				}
				
				// if we are traversing into a new object, then we want to record path to that object and return a new observable.
				// recursively returning a new observable allows us a single Observable.observe() to monitor all changes on 
				// the target object and any objects nested within.
				if (targetProp instanceof Object && targetProp !== null && target.hasOwnProperty(property) && typeof targetProp.__isProxy === "undefined") {
					
					// if we've previously setup a proxy on this target, then...
					var a = targets.indexOf(targetProp);
					if (a > -1) {
						var currentTargetsProxy = targetsProxy[a];
						var b = currentTargetsProxy.length;
						// loop through the proxies we've already created, if a given observable has already created the same proxy
						// for the same target object, then we can return that proxy (we don't need to create a new proxy).
						while (b--) {
							if (currentTargetsProxy[b].observable === observable) return currentTargetsProxy[b].proxy;
						}
					}
					
					// if we're arrived here, then that means there is no proxy for the object the user just accessed, so we
					// have to create a new proxy for it
					var newPath = (path !== "") ? (path + "." + property) : property;
					
					return _create(targetProp, domDelay, observable, newPath);
				} else {
					return targetProp;
				}
			},
 			deleteProperty: function(target, property) {
				
				// was this change an original change or was it a change that was re-triggered below
				var originalChange = true;
				if (dupProxy === proxy) {
					originalChange = false;
					dupProxy = null;
				}
				
				// in order to report what the previous value was, we must make a copy of it before it is deleted
				var previousValue = Object.assign({}, target);
 
				// get the path of the property being deleted
				var currentPath = _getPath(target, property);
				
				// record the deletion that just took place
				changes.push({"type":"delete","target":target,"property":property,"newValue":null,"previousValue":previousValue[property],"currentPath":currentPath,"proxy":proxy});

                if (typeof observable.beforeChange === "function") {
                    var res = observable.beforeChange(changes);
                    if (res === false) return false;
                }

				if (originalChange === true) {
				
					// if we have already setup a proxy on this target, then...
					var a = targets.indexOf(target);
					if (a > -1) {
						
						// loop over each proxy and see if the target for this change has any other proxies
						var b = targetsProxy[a].length;
						while (b--) {
							// if the same target has a different proxy
							if (targetsProxy[a][b].proxy !== proxy) {
								// !!IMPORTANT!! store the proxy as a duplicate proxy (dupProxy) -- this will adjust the behavior above appropriately (that is,
								// prevent a change on dupProxy from re-triggering the same change on other proxies)
								dupProxy = targetsProxy[a][b].proxy;
					
								// make the same delete on the different proxy for the same target object. it is important that we make this change *after* we invoke the same change
								// on any other proxies so that the previousValue can show up correct for the other proxies
								delete targetsProxy[a][b].proxy[property];
							}
						}
					}
				
					// perform the delete that we've trapped
					delete target[property];
				
				}
				
				_notifyObservers(changes.length);
				
				return true;
				
			},
			set: function(target, property, value, receiver) {
			
				// was this change an original change or was it a change that was re-triggered below
				var originalChange = true;
				if (dupProxy === proxy) {
					originalChange = false;
					dupProxy = null;
				}

				// improve performance by saving direct references to the property 
				var targetProp = target[property];
				
				// only record a change if the new value differs from the old one OR if this proxy was not the original proxy to receive the change
				if (targetProp !== value || originalChange === false) {
				
					var typeOfTargetProp = (typeof targetProp);
				
					// get the path of the object property being modified
					var currentPath = _getPath(target, property);
					
					// determine if we're adding something new or modifying somethat that already existed
					var type = "update";
					if (typeOfTargetProp === "undefined") type = "add";
					
					// store the change that just occurred. it is important that we store the change before invoking the other proxies so that the previousValue is correct
					changes.push({"type":type,"target":target,"property":property,"newValue":value,"previousValue":receiver[property],"currentPath":currentPath,"proxy":proxy});

                    if (typeof observable.beforeChange === "function") {
                        var res = observable.beforeChange(changes);
                        if (res === false) return false;
                    }

					// !!IMPORTANT!! if this proxy was the first proxy to receive the change, then we need to go check and see
					// if there are other proxies for the same project. if there are, then we will modify those proxies as well so the other
					// observers can be modified of the change that has occurred.
					if (originalChange === true) {

						// if we have already setup a proxy on this target, then...
						var a = targets.indexOf(target);
						if (a > -1) {
							
							// loop over each proxy and see if the target for this change has any other proxies
							var currentTargetProxy = targetsProxy[a];
							var b = currentTargetProxy.length;
							while (b--) {
								// if the same target has a different proxy
								if (currentTargetProxy[b].proxy !== proxy) {
								
									// !!IMPORTANT!! store the proxy as a duplicate proxy (dupProxy) -- this will adjust the behavior above appropriately (that is,
									// prevent a change on dupProxy from re-triggering the same change on other proxies)
									dupProxy = currentTargetProxy[b].proxy;
									
									// invoke the same change on the different proxy for the same target object. it is important that we make this change *after* we invoke the same change
									// on any other proxies so that the previousValue can show up correct for the other proxies
									currentTargetProxy[b].proxy[property] = value;
								
								}
							}
						};
						
						// if the property being overwritten is an object, then that means this observable
						// will need to stop monitoring this object and any nested objects underneath else they'll become
						// orphaned and grow memory usage. we excute this on a setTimeout so that the clean-up process does not block
						// the UI rendering -- there's no need to execute the clean up immediately
						setTimeout(function() {
							
							if (typeOfTargetProp instanceof Object) {							
								
								// loop over each property and recursively invoke the `iterate` function for any
								// objects nested on targetProp
								(function iterate(obj) {
									for (var property in obj) {
										var objProp = obj[property];
										if (objProp instanceof Object && objProp !== null) iterate(objProp);
									}
									
									// if there are any existing target objects (objects that we're already observing)...
									var c = targets.indexOf(obj);
									if (c > -1) {
										
										// ...then we want to determine if the observables for that object match our current observable
										var currentTargetProxy = targetsProxy[c];
										var d = currentTargetProxy.length;
										
										while (d--) {
											// if we do have an observable monitoring the object thats about to be overwritten
											// then we can remove that observable from the target object
											if (observable === currentTargetProxy[d].observable) {
												currentTargetProxy.splice(d,1);
												break;
											}
										}
										
										// if there are no more observables assigned to the target object, then we can remove
										// the target object altogether. this is necessary to prevent growing memory consumption particularly with large data sets
										if (currentTargetProxy.length == 0) {
											targetsProxy.splice(c,1);
											targets.splice(c,1);
										}
									}

								})(targetProp)
							}
						},10000);
						
						// because the value actually differs than the previous value
						// we need to store the new value on the original target object
						target[property] = value;
						
					};

					// notify the observer functions that the target has been modified
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

		// store the proxy we've created so it isn't re-created unnecessairly via get handler
		var proxyItem = {"target":target,"proxy":proxy,"observable":observable};
		
		var i = targets.indexOf(target);
		
		// if we have already created a Proxy for this target object then we add it to the corresponding array 
		// on targetsProxy (targets and targetsProxy work together as a Hash table indexed by the actual target object).
		if (i > -1) {
			targetsProxy[i].push(proxyItem);
		// else this is a target object that we have not yet created a Proxy for, so we must add it to targets,
		// and push a new array on to targetsProxy containing the new Proxy
		} else {
			targets.push(target);
			targetsProxy.push([proxyItem]);
		}
		
		return proxy;
	};
	
	return {
		/*	Method:
				Public method that is invoked to create a new ES6 Proxy whose changes we can observe 
				through the Observerable.observe() method.
			
			Parameters
				target - Object, required, plain JavaScript object that we want to observe for changes.
				domDelay - Boolean, required, if true, then batch up changes on a 10ms delay so a series of changes can be processed in one DOM update.
				observer - Function, optional, will be invoked when a change is made to the proxy.
			
			Returns:
				An ES6 Proxy object.
		*/
		create: function(target, domDelay, observer) {
			
			// test if the target is a Proxy, if it is then we need to retrieve the original object behind the Proxy.
			// we do not allow creating proxies of proxies because -- given the recursive design of ObservableSlim -- it would lead to sharp increases in memory usage
			if (target.__isProxy === true) {
				var target = target.__getTarget;
				//if it is, then we should throw an error. we do not allow creating proxies of proxies
				// because -- given the recursive design of ObservableSlim -- it would lead to sharp increases in memory usage
				//throw new Error("ObservableSlim.create() cannot create a Proxy for a target object that is also a Proxy.");
			}
			
			// fire off the _create() method -- it will create a new observable and proxy and return the proxy
			var proxy = _create(target, domDelay);
			
			// assign the observer function
			if (typeof observer === "function") this.observe(proxy, observer);
			
			return proxy;
			
		},
		
		/*	Method: observe
				This method is used to add a new observer function to an existing proxy.
		
			Parameters:
				proxy 	- the ES6 Proxy returned by the create() method. We want to observe changes made to this object.
				observer 	- this function will be invoked when a change is made to the observable (not to be confused with the 
							  observer defined in the create() method).
			
			Returns:
				Nothing.
		*/
		observe: function(proxy, observer) {
			// loop over all the observables created by the _create() function
			var i = observables.length;
			while (i--) {
				if (observables[i].proxy === proxy) {
					observables[i].observers.push(observer);
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
			var foundMatch = false;
			while (i--) {
				if (observables[i].proxy === proxy) {
					observables[i].paused = true;
					foundMatch = true;
					break;
				}
			};
			
			if (foundMatch == false) throw new Error("ObseravableSlim could not pause observable -- matching proxy not found.");
		},
		
		/*	Method: resume
				This method will resume execution of any observer functions when a change is made to a proxy.
			
			Parameters:
				proxy 	- the ES6 Proxy returned by the create() method.
		*/
		resume: function(proxy) {
			var i = observables.length;
			var foundMatch = false;
			while (i--) {
				if (observables[i].proxy === proxy) {
					observables[i].paused = false;
					foundMatch = true;
					break;
				}
			};
			
			if (foundMatch == false) throw new Error("ObseravableSlim could not resume observable -- matching proxy not found.");
		},
		
		/*	Method: remove
				This method will remove the observable and proxy thereby preventing any further callback observers for 
				changes occuring to the target object.
			
			Parameters:
				proxy 	- the ES6 Proxy returned by the create() method.
		*/
		remove: function(proxy) {
		
			var matchedObservable = null;
			var foundMatch = false;
			
			var c = observables.length;
			while (c--) {
				if (observables[c].proxy === proxy) {
					matchedObservable = observables[c];
					foundMatch = true;
					break;
				}
			};
			
			var a = targetsProxy.length;
			while (a--) {
				var b = targetsProxy[a].length;
				while (b--) {
					if (targetsProxy[a][b].observable === matchedObservable) {
						targetsProxy[a].splice(b,1);
						if (targetsProxy[a].length == 0) {
							targetsProxy.splice(a,1);
							targets.splice(a,1);
						};
					}
				};
			};
			
			if (foundMatch === true) {
				observables.splice(c,1);
			}
		},

        /*	Method: beforeChange
        		This method accepts a function will be invoked before changes.

			Parameters:
				proxy 	- the ES6 Proxy returned by the create() method.
				callback 	- Function, will be invoked before every change is made to the proxy, if it returns false no changes will be made.
		*/
        beforeChange: function (proxy, callback) {
            if (typeof callback !== 'function')
                throw new Error("Callback function is required");

            var i = observables.length;
            var foundMatch = false;
            while (i--) {
                if (observables[i].proxy === proxy) {
                    observables[i].beforeChange = callback;
                    foundMatch = true;
                    break;
                }
            };

            if (foundMatch == false) throw new Error("ObseravableSlim -- matching proxy not found.");
        }
	};
})();

// Export in a try catch to prevent this from erroring out on older browsers
try { module.exports = ObservableSlim; } catch (err) {};