/*
 * 	Observable Slim
 *	Version 0.1.6
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
const ObservableSlim = (function() {
	const paths = [];
	// An array that stores all of the observables created through the public create() method below.
	const observables = [];
	
	// WeakMap mapping each observed target object to array of proxy records for that target.
	// Each record is { target, proxy, observable }. Average O(1) get/set/delete (hash lookups),
	// also allows entries to be garbage-collected automatically when a target becomes unreachable.
	const targetToProxies = new WeakMap();

	// this variable tracks duplicate proxies assigned to the same target.
	// the 'set' handler below will trigger the same change on all other Proxies tracking the same target.
	// however, in order to avoid an infinite loop of Proxies triggering and re-triggering one another, we use dupProxy
	// to track that a given Proxy was modified from the 'set' handler
	let dupProxy = null;

	const _getProperty = function(obj, path) {
		return path.split('.').reduce(function(prev, curr) {
			return prev ? prev[curr] : undefined
		}, obj || self)
	};

	/**
	 * Create a new ES6 `Proxy` whose changes we can observe through the `observe()` method.
	 * @param {object} target Plain object that we want to observe for changes.
	 * @param {boolean|number} domDelay If `true`, then the observed changes to `target` will be batched up on a 10ms delay (via `setTimeout()`).
	 * If `false`, then the `observer` function will be immediately invoked after each individual change made to `target`. It is helpful to set
	 * `domDelay` to `true` when your `observer` function makes DOM manipulations (fewer DOM redraws means better performance). If a number greater
	 * than zero, then it defines the DOM delay in milliseconds.
	 * @param {function(ObservableSlimChange[])} [observer] Function that will be invoked when a change is made to the proxy of `target`.
	 * When invoked, this function is passed a single argument: an array of `ObservableSlimChange` detailing each change that has been made.
	 * @param {object} originalObservable The original observable created by the user, exists for recursion purposes, allows one observable to observe
	 * change on any nested/child objects.
	 * @param {{target: object, property: string}[]} originalPath Array of objects, each object having the properties `target` and `property`:
	 * `target` is referring to the observed object itself and `property` referring to the name of that object in the nested structure.
	 * The path of the property in relation to the target on the original observable, exists for recursion purposes, allows one observable to observe
	 * change on any nested/child objects.
	 * @returns {ProxyConstructor} Proxy of the target object.
	 */
	const _create = function(target, domDelay, originalObservable, originalPath) {

		let observable = originalObservable || null;

		// record the nested path taken to access this object -- if there was no path then we provide the first empty entry
		const path = originalPath || [{"target":target,"property":""}];
		paths.push(path);

		// in order to accurately report the "previous value" of the "length" property on an Array
		// we must use a helper property because intercepting a length change is not always possible as of 8/13/2018 in
		// Chrome -- the new `length` value is already set by the time the `set` handler is invoked
		if (target instanceof Array) {
			if (!target.hasOwnProperty("__length"))
				Object.defineProperty(target, "__length", { enumerable: false, value: target.length, writable: true });
			else
				target.__length = target.length;
		}

		let changes = [];

		/**
		 * Returns a string of the nested path (in relation to the top-level observed object) of the property being modified or deleted.
		 * @param {object} target Plain object that we want to observe for changes.
		 * @param {string} property Property name.
		 * @param {boolean} [jsonPointer] Set to `true` if the string path should be formatted as a JSON pointer rather than with the dot notation
		 * (`false` as default).
		 * @returns {string} Nested path (e.g., `hello.testing.1.bar` or, if JSON pointer, `/hello/testing/1/bar`).
		 */
		const _getPath = function(target, property, jsonPointer) {

			let fullPath = "";
			let lastTarget = null;

			// loop over each item in the path and append it to full path
			for (let i = 0; i < path.length; i++) {

				// if the current object was a member of an array, it's possible that the array was at one point
				// mutated and would cause the position of the current object in that array to change. we perform an indexOf
				// lookup here to determine the current position of that object in the array before we add it to fullPath
				if (lastTarget instanceof Array && !isNaN(path[i].property)) {
					path[i].property = lastTarget.indexOf(path[i].target);
				}

				fullPath = fullPath + "." + path[i].property
				lastTarget = path[i].target;
			}

			// add the current property
			fullPath = fullPath + "." + property;

			// remove the beginning two dots -- ..foo.bar becomes foo.bar (the first item in the nested chain doesn't have a property name)
			fullPath = fullPath.substring(2);

			if (jsonPointer === true) fullPath = "/" + fullPath.replace(/\./g, "/");

			return fullPath;
		};

		const _notifyObservers = function(numChanges) {

			// if the observable is paused, then we don't want to execute any of the observer functions
			if (observable.paused === true) return;

			const domDelayIsNumber = typeof domDelay === 'number';

			// execute observer functions on a 10ms setTimeout, this prevents the observer functions from being executed
			// separately on every change -- this is necessary because the observer functions will often trigger UI updates
 			if (domDelayIsNumber || domDelay === true) {
				setTimeout(function() {
					if (numChanges === changes.length) {

						// we create a copy of changes before passing it to the observer functions because even if the observer function
						// throws an error, we still need to ensure that changes is reset to an empty array so that old changes don't persist
						const changesCopy = changes.slice(0);
						changes = [];

						// invoke any functions that are observing changes
						for (let i = 0; i < observable.observers.length; i++) observable.observers[i](changesCopy);

					}
				}, (domDelayIsNumber && domDelay > 0) ? domDelay : 10);
			} else {

				// we create a copy of changes before passing it to the observer functions because even if the observer function
				// throws an error, we still need to ensure that changes is reset to an empty array so that old changes don't persist
				const changesCopy = changes.slice(0);
				changes = [];

				// invoke any functions that are observing changes
				for (let i = 0; i < observable.observers.length; i++) observable.observers[i](changesCopy);

			}
		};

		const handler = {
			get: function(target, property) {

				// implement a simple check for whether or not the object is a proxy, this helps the .create() method avoid
				// creating Proxies of Proxies.
				if (property === "__getTarget") {
					return target;
				} else if (property === "__isProxy") {
					return true;
				// from the perspective of a given observable on a parent object, return the parent object of the given nested object
				} else if (property === "__getParent") {
					return function(i) {
						if (typeof i === "undefined") i = 1;
						const parentPath = _getPath(target, "__getParent").split(".");
						parentPath.splice(-(i+1),(i+1));
						return _getProperty(observable.parentProxy, parentPath.join("."));
					}
				// return the full path of the current object relative to the parent observable
				} else if (property === "__getPath") {
					// strip off the 12 characters for ".__getParent"
					const parentPath = _getPath(target, "__getParent");
					return parentPath.slice(0, -12);
				}

				// for performance improvements, we assign this to a variable so we do not have to lookup the property value again
				let targetProp = target[property];
				if (target instanceof Date && targetProp instanceof Function && targetProp !== null) {
					return targetProp.bind(target);
				}

				// if we are traversing into a new object, then we want to record path to that object and return a new observable.
				// recursively returning a new observable allows us a single Observable.observe() to monitor all changes on
				// the target object and any objects nested within.
				if (targetProp instanceof Object && targetProp !== null && target.hasOwnProperty(property)) {

					// if we've found a proxy nested on the object, then we want to retrieve the original object behind that proxy
					if (targetProp.__isProxy === true) targetProp = targetProp.__getTarget;

					// Check whether this nested object already has proxies with an O(1) lookup. If records 
					// exist (ttp), try to reuse the proxy that belongs to this observable instead of creating 
					// a duplicate.
					const ttp = targetToProxies.get(targetProp);
					if (ttp && ttp.length) {
						for (let i = 0, l = ttp.length; i < l; i++) {
							// if we find a proxy that was setup for this particular observable, then return that proxy
							if (observable === ttp[i].observable) {
								return ttp[i].proxy;
							}
						}
					}

					// if we're arrived here, then that means there is no proxy for the object the user just accessed, so we
					// have to create a new proxy for it

					// create a shallow copy of the path array -- if we didn't create a shallow copy then all nested objects would share the same path array and the path wouldn't be accurate
					const newPath = path.slice(0);
					newPath.push({"target":targetProp,"property":property});
					return _create(targetProp, domDelay, observable, newPath);
				} else {
					return targetProp;
				}
			},
 			deleteProperty: function(target, property) {

				// was this change an original change or was it a change that was re-triggered below
				let originalChange = true;
				if (dupProxy === proxy) {
					originalChange = false;
					dupProxy = null;
				}

				// record the deletion that just took place
				changes.push({
					"type":"delete"
					,"target":target
					,"property":property
					,"newValue":null
					,"previousValue":target[property]
					,"currentPath":_getPath(target, property)
					,"jsonPointer":_getPath(target, property, true)
					,"proxy":proxy
				});

				if (originalChange === true) {

					// perform the delete that we've trapped if changes are not paused for this observable
					if (!observable.changesPaused) delete target[property];

					// loop over each proxy and see if the target for this change has any other proxies
					const currentTargetProxy = targetToProxies.get(target) || [];

					let b = currentTargetProxy.length;
					while (b--) {
						// if the same target has a different proxy
						if (currentTargetProxy[b].proxy !== proxy) {
							// !!IMPORTANT!! store the proxy as a duplicate proxy (dupProxy) -- this will adjust the behavior above appropriately (that is,
							// prevent a change on dupProxy from re-triggering the same change on other proxies)
							dupProxy = currentTargetProxy[b].proxy;

							// make the same delete on the different proxy for the same target object. it is important that we make this change *after* we invoke the same change
							// on any other proxies so that the previousValue can show up correct for the other proxies
							delete currentTargetProxy[b].proxy[property];
						}
					}

				}

				_notifyObservers(changes.length);

				return true;

			},
			set: function(target, property, value, receiver) {

				// if the value we're assigning is an object, then we want to ensure
				// that we're assigning the original object, not the proxy, in order to avoid mixing
				// the actual targets and proxies -- creates issues with path logging if we don't do this
				if (value && value.__isProxy) value = value.__getTarget;

				// was this change an original change or was it a change that was re-triggered below
				let originalChange = true;
				if (dupProxy === proxy) {
					originalChange = false;
					dupProxy = null;
				}

				// improve performance by saving direct references to the property
				const targetProp = target[property];

				// Only record this change if:
				// 	1. the new value differs from the old one
				//	2. OR if this proxy was not the original proxy to receive the change
				// 	3. OR the modified target is an array and the modified property is "length" and our helper property __length indicates that the array length has changed
				//
				// Regarding #3 above: mutations of arrays via .push or .splice actually modify the .length before the set handler is invoked
				// so in order to accurately report the correct previousValue for the .length, we have to use a helper property.
				if (targetProp !== value || originalChange === false || (property === "length" && target instanceof Array && target.__length !== value)) {

					let foundObservable = true;

					const typeOfTargetProp = (typeof targetProp);

					// determine if we're adding something new or modifying some that already existed
					let type = "update";
					if (typeOfTargetProp === "undefined") type = "add";

					// store the change that just occurred. it is important that we store the change before invoking the other proxies so that the previousValue is correct
					changes.push({
						"type":type
						,"target":target
						,"property":property
						,"newValue":value
						,"previousValue":receiver[property]
						,"currentPath":_getPath(target, property)
						,"jsonPointer":_getPath(target, property, true)
						,"proxy":proxy
					});

					// mutations of arrays via .push or .splice actually modify the .length before the set handler is invoked
					// so in order to accurately report the correct previousValue for the .length, we have to use a helper property.
					if (property === "length" && target instanceof Array && target.__length !== value) {
						changes[changes.length-1].previousValue = target.__length;
						target.__length = value;
					}

					// !!IMPORTANT!! if this proxy was the first proxy to receive the change, then we need to go check and see
					// if there are other proxies for the same project. if there are, then we will modify those proxies as well so the other
					// observers can be modified of the change that has occurred.
					if (originalChange === true) {

						// because the value actually differs than the previous value
						// we need to store the new value on the original target object,
						// but only as long as changes have not been paused
						if (!observable.changesPaused) target[property] = value;

						// Ensure this observable tracks the assigned object (no deep walk).
						if (value && typeof value === "object") {
							// Triggers `get` trap to _create(value, domDelay, observable, newPath)
							// which registers a proxy for 'value' under this observable.
							void proxy[property];
						}


						foundObservable = false;

						// O(1) check that this observable is still active by verifying its parentTarget is still tracked
						if (targetToProxies.has(observable.parentTarget)) {
							foundObservable = true;
						}

						// if we didn't find an observable for this proxy, then that means .remove(proxy) was likely invoked
						// so we no longer need to notify any observer function about the changes, but we still need to update the
						// value of the underlying original objects see below: target[property] = value;
						if (foundObservable) {

							// loop over each proxy and see if the target for this change has any other proxies
							const currentTargetProxy = targetToProxies.get(target) || [];
							for (let b = 0, l = currentTargetProxy.length; b < l; b++) {
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

							// if the property being overwritten is an object, then that means this observable
							// will need to stop monitoring this object and any nested objects underneath the overwritten object else they'll become
							// orphaned and grow memory usage. we execute this on a setTimeout so that the clean-up process does not block
							// the UI rendering -- there's no need to execute the clean up immediately
							setTimeout(function() {

								if (typeOfTargetProp === "object" && targetProp !== null) {

									// check if the to-be-overwritten target property still exists on the target object
									// if it does still exist on the object, then we don't want to stop observing it. this resolves
									// an issue where array .sort() triggers objects to be overwritten, but instead of being overwritten
									// and discarded, they are shuffled to a new position in the array
									let keys = Object.keys(target);
									for (let i = 0, l = keys.length; i < l; i++) {
										if (target[keys[i]] === targetProp) return;
									}

									let stillExists = false;

									// now we perform the more expensive search recursively through the target object.
									// if we find the targetProp (that was just overwritten) still exists somewhere else
									// further down in the object, then we still need to observe the targetProp on this observable.
									(function iterate(target) {
										let keys = Object.keys(target);
										for (let i = 0, l = keys.length; i < l; i++) {

											const property = keys[i];
											const nestedTarget = target[property];

											if (nestedTarget instanceof Object && nestedTarget !== null) iterate(nestedTarget);
											if (nestedTarget === targetProp) {
												stillExists = true;
												return;
											}
										};
									})(target);

									// even though targetProp was overwritten, if it still exists somewhere else on the object,
									// then we don't want to remove the observable for that object (targetProp)
									if (stillExists === true) return;

									// loop over each property and recursively invoke the `iterate` function for any
									// objects nested on targetProp
									(function iterate(obj) {

										let keys = Object.keys(obj);
										for (let i = 0, l = keys.length; i < l; i++) {
											const objProp = obj[keys[i]];
											if (objProp instanceof Object && objProp !== null) iterate(objProp);
										}

										// if there are any existing target objects (objects that we're already observing)...
										if (targetToProxies.has(obj)) {

											// ...then we want to determine if the observables for that object match our current observable
											const currentTargetProxy = targetToProxies.get(obj);
											let d = currentTargetProxy.length;

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
											if (currentTargetProxy.length === 0) {
												targetToProxies.delete(obj);
											}
										}

									})(targetProp)
								}
							},10000);
						}

					};

					if (foundObservable) {
						// notify the observer functions that the target has been modified
						_notifyObservers(changes.length);
					}

				}
				return true;
			}
		}

		// create the proxy that we'll use to observe any changes
		const proxy = new Proxy(target, handler);

		// we don't want to create a new observable if this function was invoked recursively
		if (observable === null) {
			observable = {"parentTarget":target, "domDelay":domDelay, "parentProxy":proxy, "observers":[],"paused":false,"path":path,"changesPaused":false,"proxyRefs":[]};
			observables.push(observable);
		}

		// store the proxy we've created so it isn't re-created unnecessarily via get handler
		const proxyItem = {"target":target,"proxy":proxy,"observable":observable};

		// Keep a per-observable backreference to every proxy we create.
		// remove() uses this to detach the observable from all of its proxies in O(k) time,
		// where k = number of proxies for this observable.
		if (observable.proxyRefs) observable.proxyRefs.push(proxyItem);

		// Track proxies by *target object* using a WeakMap for O(1) average get/set.
		// The target object itself is the key. The value is the array of { target, proxy, observable } records.
		// WeakMap entries are garbage-collected when the target becomes unreachable, preventing leaks.
		// On creation, append to the existing list for this target or initialize a new one.
		if (targetToProxies.has(target)) {
			targetToProxies.get(target).push(proxyItem);
		} else {
			targetToProxies.set(target, [proxyItem]);
		}

		return proxy;
	};

	/**
	 * @typedef {object} ObservableSlimChange Observed change.
	 * @property {"add"|"update"|"delete"} type Change type.
	 * @property {string} property Property name.
	 * @property {string} currentPath Property path with the dot notation (e.g. `foo.0.bar`).
	 * @property {string} jsonPointer Property path with the JSON pointer syntax (e.g. `/foo/0/bar`). See https://datatracker.ietf.org/doc/html/rfc6901.
	 * @property {Source} target Target object.
	 * @property {Source} proxy Proxy of the target object.
	 * @property {Source} newValue New value of the property.
	 * @property {Source} [previousValue] Previous value of the property
	 */

	return {
		/**
		 * @template Source
		 * Create a new ES6 `Proxy` whose changes we can observe through the `observe()` method.
		 * @param {Source} target Plain object that we want to observe for changes.
		 * @param {boolean|number} domDelay If `true`, then the observed changes to `target` will be batched up on a 10ms delay (via `setTimeout()`).
		 * If `false`, then the `observer` function will be immediately invoked after each individual change made to `target`. It is helpful to set
		 * `domDelay` to `true` when your `observer` function makes DOM manipulations (fewer DOM redraws means better performance). If a number greater
		 * than zero, then it defines the DOM delay in milliseconds.
		 * @param {(mutations: ObservableSlimChange[]) => void} [observer] Function that will be invoked when a change is made to the proxy of `target`.
		 * When invoked, this function is passed a single argument: an array of `ObservableSlimChange` detailing each change that has been made.
		 * @returns {Source} Proxy of the target object.
		 */
		create: function(target, domDelay, observer) {

			// test if the target is a Proxy, if it is then we need to retrieve the original object behind the Proxy.
			// we do not allow creating proxies of proxies because -- given the recursive design of ObservableSlim -- it would lead to sharp increases in memory usage
			if (target.__isProxy === true) {
				target = target.__getTarget;
				//if it is, then we should throw an error. we do not allow creating proxies of proxies
				// because -- given the recursive design of ObservableSlim -- it would lead to sharp increases in memory usage
				//throw new Error("ObservableSlim.create() cannot create a Proxy for a target object that is also a Proxy.");
			}

			// fire off the _create() method -- it will create a new observable and proxy and return the proxy
			const proxy = _create(target, domDelay);

			// assign the observer function
			if (typeof observer === "function") this.observe(proxy, observer);

			// recursively loop over all nested objects on the proxy we've just created
			// this will allow the top observable to observe any changes that occur on a nested object
			(function iterate(proxy) {
				const target = proxy.__getTarget;
				const keys  = Object.keys(target);
				for (let i = 0, l = keys.length; i < l; i++) {
					const property = keys[i];
					if (target[property] instanceof Object && target[property] !== null) iterate(proxy[property]);
				}
			})(proxy);

			return proxy;

		},

		/**
		 * @template Source
		 * Add a new observer function to an existing proxy.
		 * @param {Source} proxy An ES6 `Proxy` created by the `create()` method.
		 * @param {(mutations: ObservableSlimChange[]) => void} observer Function that will be invoked when a change is made to the proxy of `target`.
		 * When invoked, this function is passed a single argument: an array of `ObservableSlimChange` detailing each change that has been made.
		 * @returns {void} Does not return any value.
		 */
		observe: function(proxy, observer) {
			// loop over all the observables created by the _create() function
			let i = observables.length;
			while (i--) {
				if (observables[i].parentProxy === proxy) {
					observables[i].observers.push(observer);
					break;
				}
			};
		},

		/**
		 * @template Source
		 * Prevent any observer functions from being invoked when a change occurs to a proxy.
		 * @param {Source} proxy An ES6 `Proxy` created by the `create()` method.
		 * @returns {void} Does not return any value.
		 */
		pause: function(proxy) {
			let i = observables.length;
			let foundMatch = false;
			while (i--) {
				if (observables[i].parentProxy === proxy) {
					observables[i].paused = true;
					foundMatch = true;
					break;
				}
			};

			if (foundMatch === false) throw new Error("ObservableSlim could not pause observable -- matching proxy not found.");
		},

		/**
		 * @template Source
		 * Resume execution of any observer functions when a change is made to a proxy.
		 * @param {Source} proxy An ES6 `Proxy` created by the `create()` method.
		 * @returns {void} Does not return any value.
		 */
		resume: function(proxy) {
			let i = observables.length;
			let foundMatch = false;
			while (i--) {
				if (observables[i].parentProxy === proxy) {
					observables[i].paused = false;
					foundMatch = true;
					break;
				}
			};

			if (foundMatch === false) throw new Error("ObservableSlim could not resume observable -- matching proxy not found.");
		},

		/**
		 * @template Source
		 * Prevent any changes (i.e., `set`, and `deleteProperty`) from being written to the target object.
		 * However, the observer functions will still be invoked to let you know what changes **WOULD** have been made.
		 * This can be useful if the changes need to be approved by an external source before the changes take effect.
		 * @param {Source} proxy An ES6 `Proxy` created by the `create()` method.
		 * @returns {void} Does not return any value.
		 */
		pauseChanges: function(proxy){
			let i = observables.length;
			let foundMatch = false;
			while (i--) {
				if (observables[i].parentProxy === proxy) {
					observables[i].changesPaused = true;
					foundMatch = true;
					break;
				}
			};

			if (foundMatch === false) throw new Error("ObservableSlim could not pause changes on observable -- matching proxy not found.");
		},

		/**
		 * @template Source
		 * Resume the changes that were taking place prior to the call to `pauseChanges()` method.
		 * @param {Source} proxy An ES6 `Proxy` created by the `create()` method.
		 * @returns {void} Does not return any value.
		 */
		resumeChanges: function(proxy){
			let i = observables.length;
			let foundMatch = false;
			while (i--) {
				if (observables[i].parentProxy === proxy) {
					observables[i].changesPaused = false;
					foundMatch = true;
					break;
				}
			};

			if (foundMatch === false) throw new Error("ObservableSlim could not resume changes on observable -- matching proxy not found.");
		},

		/**
		 * @template Source
		 * Remove the observable and proxy thereby preventing any further callback observers for changes occurring to the target object.
		 * @param {Source} proxy An ES6 `Proxy` created by the `create()` method.
		 * @returns {void} Does not return any value.
		 */
		remove: function(proxy) {

			let matchedObservable = null;
			let foundMatch = false;

			let c = observables.length;
			while (c--) {
				if (observables[c].parentProxy === proxy) {
					matchedObservable = observables[c];
					foundMatch = true;
					break;
				}
			};

			// Efficient removal using per-observable proxy references (O(k) where k is proxies for this observable).
			if (foundMatch === true && matchedObservable && matchedObservable.proxyRefs) {
				let list = matchedObservable.proxyRefs;
				let i = list.length;
				while (i--) {
					const item = list[i];
					const arr = targetToProxies.get(item.target);
					if (arr) {
						let j = arr.length;
						while (j--) {
							if (arr[j].observable === matchedObservable) {
								arr.splice(j,1);
							}
						}
						if (arr.length === 0) {
							targetToProxies.delete(item.target);
						}
					}
				}
				matchedObservable.proxyRefs.length = 0;
			}

			if (foundMatch === true) {
				observables.splice(c,1);
			}
		}
	};
})();

// Export in a try catch to prevent this from erroring out on older browsers
try { module.exports = ObservableSlim; } catch (err) {};