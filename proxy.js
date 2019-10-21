/*
* Copyright 2016 Google Inc. All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not
* use this file except in compliance with the License. You may obtain a copy of
* the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
* WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
* License for the specific language governing permissions and limitations under
* the License.
*/

//'use strict';


(function(scope) {
	if (scope['Proxy']) {
		return;
	}
	let lastRevokeFn = null;

	/**
	* @param {*} o
	* @return {boolean} whether this is probably a (non-null) Object
	*/
	function isObject(o) {
		return o ? (typeof o === 'object' || typeof o === 'function') : false;
	}

	/**
	* @constructor
	* @param {!Object} target
	* @param {{apply, construct, get, set}} handler
	*/
	scope.Proxy = function(target, handler) {
		if (!isObject(target) || !isObject(handler)) {
		  throw new TypeError('Cannot create proxy with a non-object as target or handler');
		}
	
		// Construct revoke function, and set lastRevokeFn so that Proxy.revocable can steal it.
		// The caller might get the wrong revoke function if a user replaces or wraps scope.Proxy
		// to call itself, but that seems unlikely especially when using the polyfill.
		let throwRevoked = function() {};
		lastRevokeFn = function() {
			throwRevoked = function(trap) {
				throw new TypeError("Cannot perform '"+trap+" on a proxy that has been revoked");
			};
		};

		// Fail on unsupported traps: Chrome doesn't do this, but ensure that users of the polyfill
		// are a bit more careful. Copy the internal parts of handler to prevent user changes.
		const unsafeHandler = handler;
		handler = {'get': null, 'set': null, 'deleteProperty':null, 'apply': null, 'construct': null};
		for (let k in unsafeHandler) {
			if (!(k in handler)) {
				throw new TypeError("Proxy polyfill does not support trap '"+k+"'");
			}
			handler[k] = unsafeHandler[k];
		}
		if (typeof unsafeHandler === 'function') {
			// Allow handler to be a function (which has an 'apply' method). This matches what is
			// probably a bug in native versions. It treats the apply call as a trap to be configured.
			handler.apply = unsafeHandler.apply.bind(unsafeHandler);
		}

		// Define proxy as this, or a Function (if either it's callable, or apply is set).
		// TODO(samthor): Closure compiler doesn't know about 'construct', attempts to rename it.
		let proxy = this;
		let isMethod = false;
		let isArray = false;
		if (typeof target === 'function') {
			proxy = function Proxy() {
				const usingNew = (this && this.constructor === proxy);
				const args = Array.prototype.slice.call(arguments);
				throwRevoked(usingNew ? 'construct' : 'apply');

				if (usingNew && handler['construct']) {
					return handler['construct'].call(this, target, args);
				} else if (!usingNew && handler.apply) {
					return handler.apply(target, this, args);
				}

				// since the target was a function, fallback to calling it directly.
				if (usingNew) {
					// inspired by answers to https://stackoverflow.com/q/1606797
					args.unshift(target);  // pass class as first arg to constructor, although irrelevant
					// nb. cast to convince Closure compiler that this is a constructor
					const f = /** @type {!Function} */ (target.bind.apply(target, args));
					return new f();
				}
				return target.apply(this, args);
			};
			isMethod = true;
		} else if (target instanceof Array) {
			proxy = [];	  
			isArray = true;
		}

		// Create default getters/setters. Create different code paths as handler.get/handler.set can't
		// change after creation.
		const getter = handler.get ? function(prop) {
			throwRevoked('get');
			return handler.get(this, prop, proxy);
		} : function(prop) {
			throwRevoked('get');
			return this[prop];
		};
		const setter = handler.set ? function(prop, value) {
			throwRevoked('set');

			const status = handler.set(this, prop, value, proxy);
			if (!status) {
				// TODO(samthor): If the calling code is in strict mode, throw TypeError.
				// It's (sometimes) possible to work this out, if this code isn't strict- try to load the
				// callee, and if it's available, that code is non-strict. However, this isn't exhaustive.
			}
		} : function(prop, value) {
			throwRevoked('set');
			this[prop] = value;
		};

		const deleter = handler.deleteProperty ? function(prop) {
			throwRevoked('deleteProperty');
			return handler.deleteProperty(this, prop);
		} : function(prop) {
			throwRevoked('get');
			delete this[prop];
		};



		// Clone direct properties (i.e., not part of a prototype).
		const propertyNames = Object.getOwnPropertyNames(target);
		const propertyMap = {};
		propertyNames.forEach(function(prop) {
			if ((isMethod || isArray) && prop in proxy) {
				return;  // ignore properties already here, e.g. 'bind', 'prototype' etc
			}
			const real = Object.getOwnPropertyDescriptor(target, prop);
			const desc = {
				enumerable: !!real.enumerable,
				configurable: !!real.configurable,
				get: getter.bind(target, prop),
				set: setter.bind(target, prop),
			};
			Object.defineProperty(proxy, prop, desc);
			propertyMap[prop] = true;
		});

		// Set the prototype, or clone all prototype methods (always required if a getter is provided).
		// TODO(samthor): We don't allow prototype methods to be set. It's (even more) awkward.
		// An alternative here would be to _just_ clone methods to keep behavior consistent.
		let prototypeOk = true;
		if (Object.setPrototypeOf) {
			Object.setPrototypeOf(proxy, Object.getPrototypeOf(target));
		} else if (proxy.__proto__) {
			proxy.__proto__ = target.__proto__;
		} else {
			prototypeOk = false;
		}
		if (handler.get || !prototypeOk) {
			for (let k in target) {
				if (propertyMap[k]) {
				  continue;
				}
				Object.defineProperty(proxy, k, {get: getter.bind(target, k)});
			}
		}

		proxy.__isProxy = true;
		proxy.__getTarget = target;

		
		let _getDesc = function(target, prop) {
			const desc = {
				enumerable: true,
				configurable: true,
				get: getter.bind(target, prop),
				set: setter.bind(target, prop),
			};
			return desc;
		};
		
		if (proxy instanceof Array) {
			
			proxy.unshift = function() {
				let proxyLength = proxy.length;
				target.length = proxy.length = target.length + arguments.length;
				
				for (let i = 0; i < arguments.length; i++) {
					let prop = (i+proxyLength).toString();
					Object.defineProperty(proxy, prop, _getDesc(target,prop));
				}
				var returnValue = Array.prototype.unshift.apply(this,arguments);
				proxy.length = returnValue = target.length;
				return returnValue;
			};
			
			proxy.push = function() {
				target.length = proxy.length = target.length + 1;
				let prop = (target.length-1).toString();
				Object.defineProperty(proxy, prop, _getDesc(target,prop));
				var returnValue = Array.prototype.push.apply(this,arguments);
				proxy[proxy.length-2] = proxy[proxy.length-1];
				proxy.length = target.length;
				return returnValue;
			};
			
			proxy.pop = function() {
				let prop = (target.length-1).toString();
				var returnValue = Array.prototype.pop.apply(this,arguments);
				deleter.call(target, prop);
				// we need this line to get the previousValue correct
				proxy.length = target.length;
				setter.call(target, "length", (target.length-1));
				proxy.length = target.length;
				return returnValue;
			};
				
			proxy.splice = function(start, deleteCount, newItem) {
				
				if (deleteCount < 0) deleteCount = 0;
				
				if (deleteCount > 0) {
					if (typeof(newItem) !== "undefined") {
						var endCount = start + 1;
						var totalDelete = deleteCount - 1;
					} else {
						var endCount = start;
						var totalDelete = deleteCount;
					}
					
					var deletedItems = [];
					for (var i = (start + deleteCount - 1); i >= endCount; i--) {
						let prop = (i).toString();
						deletedItems.unshift(target[prop]);
						deleter.call(target, prop);
					}
					
					var returnValue = Array.prototype.splice.apply(this,arguments);
					
					// make the returned items from the splice (an array of the removed items) match the content of a native splice
					// we re-insert the values that we removed manually above
					if (typeof(newItem) !== "undefined") {
						for (var i = 1; i < returnValue.length; i++) returnValue[i] = deletedItems[i-1];
					} else {
						for (var i = 0; i < returnValue.length; i++) returnValue[i] = deletedItems[i];
					}
					
					// we need this line to get the previousValue correct
					proxy.length = target.length;
					setter.call(target, "length", (target.length-totalDelete));
					proxy.length = target.length;
					
					return returnValue;
				} else if (typeof(newItem) !== "undefined") {
					target.length = proxy.length = target.length + 1;
					let prop = (target.length-1).toString();
					Object.defineProperty(proxy, prop, _getDesc(target,prop));
					var returnValue = Array.prototype.splice.apply(this,arguments);
					proxy.length = target.length;
					return returnValue;
				} else {
					return [];
				}
				
			};
			
			proxy.shift = function() {
				var returnValue = target[0];
				for (var i = 0; i < (target.length-1); i++) {
					setter.call(target, i.toString(), target[i+1]);
				}
				deleter.call(target, (target.length-1).toString());
				proxy.length = target.length;
				setter.call(target, "length", (target.length-1));
				proxy.length = target.length;
				return returnValue;
			};
			
		} else if (proxy instanceof Date) {
			Object
				.getOwnPropertyNames(Date.prototype)
				.forEach(function(k){
					Object.defineProperty(proxy, k, {get: getter.bind(target, k)});
				});
		} else {
			// The Proxy polyfill cannot handle adding new properties. Seal the target and proxy.
			Object.seal(target);
			Object.seal(proxy);
		}
	
		return proxy;  // nb. if isMethod is true, proxy != this
	};

	scope.Proxy.revocable = function(target, handler) {
		const p = new scope.Proxy(target, handler);
		return {'proxy': p, 'revoke': lastRevokeFn};
	};

	scope.Proxy['revocable'] = scope.Proxy.revocable;
	scope['Proxy'] = scope.Proxy;
})(typeof process !== 'undefined' && {}.toString.call(process) === '[object process]' ? global : self);