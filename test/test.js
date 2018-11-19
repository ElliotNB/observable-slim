var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var ObservableSlim = require("../observable-slim.js");
global.NativeProxy = global.Proxy;
global.Proxy = undefined;
require("../proxy.js");
global.PolyfillProxy = global.Proxy;

describe('Native Proxy', function() {
	this.timeout(11000);
	suite(global.NativeProxy);
});

describe('ES5 Polyfill Proxy', function() {
	this.timeout(11000);
	suite(global.PolyfillProxy);
});

function suite(proxy) {
	
	var test, p;

	beforeEach(() => { 
		global.Proxy = proxy;
		test = {};
		p = ObservableSlim.create(test, false, function(changes) { return null; });
	});

	it('1. Add a new string property (not supported with ES5 polyfill).', () => {
		if (global.Proxy === global.NativeProxy) {
			ObservableSlim.observe(p, function(changes) {
				expect(changes[0].type).to.equal("add");
				expect(changes[0].newValue).to.equal("world");
			});
			p.hello = "world";
			expect(p.hello).to.equal("world");
			expect(test.hello).to.equal("world");
		}
	});  

	it('2. Modify string property value.', () => {
		var test = {"hello":""};
		var p = ObservableSlim.create(test, false, function(changes) { 
			expect(changes[0].type).to.equal("update");
			expect(changes[0].newValue).to.equal("WORLD");
		});
		
		p.hello = "WORLD";
		expect(p.hello).to.equal("WORLD");
		expect(test.hello).to.equal("WORLD");
	});
	
	it('2. Modify string property value with DOM delay included.', (done) => {
		var test = {"hello":""};
		var p = ObservableSlim.create(test, true, function(changes) { 
			expect(changes[0].type).to.equal("update");
			expect(changes[0].newValue).to.equal("WORLD");
		});
		
		p.hello = "WORLD";
		setTimeout(function() {
			expect(p.hello).to.equal("WORLD");
			expect(test.hello).to.equal("WORLD");
			done();
		},100);
	});
	
	it('3. Modify a deeply nested array item.', () => {
		var test = {"hello":{"testing":{"foo":["testing",{"stuff":"hey"},"here"]}}};
		var p = ObservableSlim.create(test, false, function(changes) { 
		
			expect(changes[0].type).to.equal("update");
			expect(changes[0].newValue).to.equal("WORLD");
			expect(changes[0].currentPath).to.equal("hello.testing.foo.1.stuff");
			expect(changes[0].jsonPointer).to.equal("/hello/testing/foo/1/stuff");
		});
		
		p.hello.testing.foo[1].stuff = "WORLD";
		expect(p.hello.testing.foo[1].stuff).to.equal("WORLD");
		expect(test.hello.testing.foo[1].stuff).to.equal("WORLD");
	});

	it('4. Add a new object property (not supported with ES5 polyfill).', () => {
		if (global.Proxy === global.NativeProxy) {	
			ObservableSlim.observe(p, function(changes) {
				expect(changes[0].type).to.equal("add");
				expect(changes[0].newValue).to.be.an.instanceof(Object);
			});
			p.testing = {};
			expect(p.testing).to.be.an.instanceof(Object);
			expect(test.testing).to.be.an.instanceof(Object);
		}
	});
	
	it('5. Set property equal to object.', () => {
		var test = {"testing":false};
		var p = ObservableSlim.create(test, false, function(changes) { 
			expect(changes[0].type).to.equal("update");
			expect(changes[0].newValue).to.be.an.instanceof(Object);
		});
		p.testing = {};
		expect(p.testing).to.be.an.instanceof(Object);
		expect(test.testing).to.be.an.instanceof(Object);
	});

	it('6. Add a new nested number property (not supported with ES5 polyfill).', () => {
		if (global.Proxy === global.NativeProxy) {
			ObservableSlim.observe(p, function(changes) {
				expect(changes[0].type).to.equal("add");
				expect(changes[0].newValue).to.equal(42);
				expect(changes[0].currentPath).to.equal("testing.blah");
			});
			test.testing = {};
			p.testing.blah = 42;
			expect(p.testing.blah).to.be.equal(42);
			expect(test.testing.blah).to.be.equal(42);
		}
	});

	it('7. Update nested number property.', () => {
		var test = {};
		test.testing = {};
		test.testing.blah = 0;
		var p = ObservableSlim.create(test, false, function(changes) { 
			expect(changes[0].type).to.equal("update");
			expect(changes[0].newValue).to.equal(42);
			expect(changes[0].currentPath).to.equal("testing.blah");
		});
		p.testing.blah = 42;
		expect(p.testing.blah).to.be.equal(42);
		expect(test.testing.blah).to.be.equal(42);
	});
	
	it('8. Set property as a new array.', () => {
		var test = {"arr":false};
		var p = ObservableSlim.create(test, false, function(changes) {
			expect(changes[0].type).to.equal("update");
			expect(changes[0].newValue).to.be.an.instanceof(Array);
		});
		p.arr = [];
		expect(p.arr).to.be.an.instanceof(Array);
		expect(test.arr).to.be.an.instanceof(Array);
	});
	
	it('9. Add a new array property (not supported with ES5 polyfill).', () => {
		if (global.Proxy === global.NativeProxy) {
			ObservableSlim.observe(p, function(changes) {
				expect(changes[0].type).to.equal("add");
				expect(changes[0].newValue).to.be.an.instanceof(Array);
			});
			p.arr = [];
			expect(p.arr).to.be.an.instanceof(Array);
			expect(test.arr).to.be.an.instanceof(Array);
		}
	});

	it('10. Push item on to an array.', () => {
		var test = {"arr":[]};
		var change = 0;
		var p = ObservableSlim.create(test, false, function(changes) {
			if (change === 0) {
				expect(changes[0].type).to.equal("add");
				expect(changes[0].newValue).to.equal("hello world");
				expect(changes[0].currentPath).to.equal("arr.0");
				expect(changes[0].property).to.equal("0");
			} else if (change === 1) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].currentPath).to.equal("arr.length");
				expect(changes[0].property).to.equal("length");
				expect(changes[0].previousValue).to.equal(0);
				expect(changes[0].newValue).to.equal(1);
			}
			change++;
		});
		
		p.arr.push("hello world");
		expect(p.arr[0]).to.equal("hello world");
		expect(test.arr[0]).to.equal("hello world");
	});
	
	it('11. Unshift item to an array.', () => {
		var change = 0;
		var test = {"arr":["foo bar"]};
		var p = ObservableSlim.create(test, false, function(changes) {
			if (change === 0) {
				expect(changes[0].type).to.equal("add");
				expect(changes[0].newValue).to.equal("foo bar");
				expect(changes[0].currentPath).to.equal("arr.1");
				expect(changes[0].property).to.equal("1");
			} else if (change === 1) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].newValue).to.equal("hello world");
				expect(changes[0].previousValue).to.equal("foo bar");
				expect(changes[0].currentPath).to.equal("arr.0");
				expect(changes[0].property).to.equal("0");
			}
			change++;
		});
		
		var length = p.arr.unshift("hello world");
		expect(p.arr[0]).to.equal("hello world");
		expect(test.arr[0]).to.equal("hello world");
		expect(p.arr.length).to.equal(2);
		expect(test.arr.length).to.equal(2);
		expect(length).to.equal(2);
	});
	
	it('12. Pop an item from an array.', () => {
		var change = 0;
		var test = {"arr":["hello world","foo bar"]};
		var p = ObservableSlim.create(test, false, function(changes) {			
			if (change === 0) {
				expect(changes[0].type).to.equal("delete");
				expect(changes[0].property).to.equal("1");
				expect(changes[0].newValue).to.equal(null);
				expect(changes[0].previousValue).to.equal("foo bar");
				expect(changes[0].currentPath).to.equal("arr.1");
				
			} else if (change === 1) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].property).to.equal("length");
				expect(changes[0].newValue).to.equal(1);
				expect(changes[0].previousValue).to.equal(2);
				expect(changes[0].currentPath).to.equal("arr.length");
			}
			
			change++;
		});
		
		var lastItem = p.arr[1];
		var popItem = p.arr.pop();
		
		var popLastSame = (lastItem === popItem);
		
		expect(p.arr[0]).to.equal("hello world");
		expect(test.arr[0]).to.equal("hello world");
		expect(test.arr.length).to.equal(1);
		expect(p.arr.length).to.equal(1);
		expect(popLastSame).to.equal(true);
	});

	it('13. Splice first item from an array.', () => {
		var change = 0;
		var test = {};
		test.arr = [];
		test.arr.push("hello world");
		var p = ObservableSlim.create(test, false, function(changes) {
			if (change === 0) {
				firstChange = false;
				expect(changes[0].type).to.equal("delete");
				expect(changes[0].previousValue).to.equal("hello world");
			} else if (change === 0) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].property).to.equal("length");
			}
			change++;
		});
		p.arr.splice(0,1);
		expect(test.arr.length).to.equal(0);
		expect(p.arr.length).to.equal(0);
	});
	
	it('14. Insert item into an array using splice.', () => {
		var change = 0;
		var test = {"arr":["hello world","foo bar","sunday","sunday"]};
		var p = ObservableSlim.create(test, false, function(changes) {
			if (change === 0) {
				expect(changes[0].type).to.equal("add");
				expect(changes[0].property).to.equal("4");
				expect(changes[0].newValue).to.equal("sunday");
				expect(changes[0].previousValue).to.equal(undefined);
				expect(changes[0].currentPath).to.equal("arr.4");
			} else if (change === 1) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].property).to.equal("2");
				expect(changes[0].newValue).to.equal("foo bar");
				expect(changes[0].previousValue).to.equal("sunday");
				expect(changes[0].currentPath).to.equal("arr.2");
			} else if (change === 2) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].property).to.equal("1");
				expect(changes[0].newValue).to.equal("inserting");
				expect(changes[0].previousValue).to.equal("foo bar");
				expect(changes[0].currentPath).to.equal("arr.1");
			}
			change++;
		});
		
		var val = p.arr.splice(1,0, "inserting");
		
		expect(test.arr.length).to.equal(5);
		expect(p.arr.length).to.equal(5);
		expect(test.arr[1]).to.equal("inserting");
		expect(p.arr[1]).to.equal("inserting");
		expect(val.length).to.equal(0);
	});
	
	it('15. Insert new item and remove two items from an array using splice.', () => {
		var change = 0;
		var test = {"arr":["hello world","foo bar","sunday","tuesday"]};
		var p = ObservableSlim.create(test, false, function(changes) {});
		
		var val = p.arr.splice(1,2, "inserting");
		
		expect(test.arr.length).to.equal(3);
		expect(p.arr.length).to.equal(3);
		expect(test.arr[1]).to.equal("inserting");
		expect(p.arr[1]).to.equal("inserting");
		expect(JSON.stringify(test.arr)).to.equal('["hello world","inserting","tuesday"]');
		expect(JSON.stringify(p.arr)).to.equal('["hello world","inserting","tuesday"]');
		expect(val.length).to.equal(2);
		expect(val[0]).to.equal("foo bar");
		expect(val[1]).to.equal("sunday");
		
	});
	
	it('16. Shift the first item off an array.', () => {
		var change = 0;
		var test = {"arr":["foo bar","hello world"]};
		var p = ObservableSlim.create(test, false, function(changes) {
			if (change === 0) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].property).to.equal("0");
				expect(changes[0].newValue).to.equal("hello world");
				expect(changes[0].previousValue).to.equal("foo bar");
				expect(changes[0].currentPath).to.equal("arr.0");
				
			} else if (change === 1) {
				expect(changes[0].type).to.equal("delete");
				expect(changes[0].property).to.equal("1");
				expect(changes[0].newValue).to.equal(null);
				expect(changes[0].previousValue).to.equal("hello world");
				expect(changes[0].currentPath).to.equal("arr.1");
			} else if (change === 2) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].property).to.equal("length");
				expect(changes[0].newValue).to.equal(1);
				expect(changes[0].previousValue).to.equal(2);
				expect(changes[0].currentPath).to.equal("arr.length");
			}
			change++;
		});
		
		var removedItem = p.arr.shift();
		expect(p.arr[0]).to.equal("hello world");
		expect(test.arr[0]).to.equal("hello world");
		expect(p.arr.length).to.equal(1);
		expect(test.arr.length).to.equal(1);
		expect(removedItem).to.equal("foo bar");
	});
	
	it('17. currentPath is updated correctly when the position of an Object in an Array changes.', () => {
		
		var change = 0;
		var test = [{},{"foo":"test"}];
		var p = ObservableSlim.create(test, false, function(changes) {
			
			// the change events differ slightly when using the ES5 Proxy polyfill, so we skip that part of the validation 
			// when the proxy is in use
			if (global.Proxy === global.NativeProxy) {
				if (change === 0) {
					expect(changes[0].type).to.equal("update");
					expect(changes[0].property).to.equal("0");
					expect(changes[0].currentPath).to.equal("0");
				} else if (change === 1) {
					expect(changes[0].type).to.equal("delete");
					expect(changes[0].property).to.equal("1");
					expect(changes[0].currentPath).to.equal("1");
				} else if (change === 2) {
					expect(changes[0].type).to.equal("update");
					expect(changes[0].property).to.equal("length");
					expect(changes[0].newValue).to.equal(1);
					expect(changes[0].previousValue).to.equal(2);
					expect(changes[0].currentPath).to.equal("length");
				} else if (change === 3) {
					expect(changes[0].type).to.equal("update");
					expect(changes[0].property).to.equal("foo");
					expect(changes[0].newValue).to.equal("bar");
					expect(changes[0].previousValue).to.equal("test");
					expect(changes[0].currentPath).to.equal("0.foo");
				}
			}
			
			change++;
			
		});
		
		p.splice(0, 1);
		p[0].foo = "bar";
		
		expect(test.length).to.equal(1);
		expect(test[0].foo).to.equal("bar");
		
	});
	
	
	it('18. Delete a property (not supported with ES5 polyfill).', () => {
		if (global.Proxy === global.NativeProxy) {
			ObservableSlim.create(test, function(changes) {
				expect(changes[0].type).to.equal("delete");
				expect(changes[0].property).to.equal("hello");
			});

			test.hello = "hello";
			delete p.hello;

			expect(test.hello).to.be.an('undefined');
			expect(p.hello).to.be.an('undefined');
		}
	});

	it('19. __isProxy check', () => {
		expect(p.__isProxy).to.be.equal(true);
	});
	
	it('20. __getTarget check', () => {
		var isSameObject = false;
		if (p.__getTarget === test) isSameObject = true;
		expect(isSameObject).to.be.equal(true);
	});
	
	it('21. __getParent on nested object (not supported with ES5 polyfill).', () => {
		if (global.Proxy === global.NativeProxy) {
			p.hello = {};
			p.hello.blah = {"found":"me"};
			test.hello.blah.foo = {};
			var target = p.hello.blah.foo;
			expect(target.__getParent().found).to.equal("me");
		}
	});
	
	it('22. Multiple observables on same object.', () => {
		var test = {"dummy":"blah"};
		var firstProxy = false;
		var secondProxy = false;
		var pp = ObservableSlim.create(test, false, function(changes) { 
			if (changes[0].currentPath == "dummy" && changes[0].newValue == "foo") {
				firstProxy = true;
			}
		});
		var ppp = ObservableSlim.create(pp, false, function(changes) { 
			if (changes[0].currentPath == "dummy" && changes[0].newValue == "foo") {
				secondProxy = true;
			}
		});
		
		ppp.dummy = "foo";
		
		expect(firstProxy).to.equal(true);
		expect(secondProxy).to.equal(true);
	});
	
	it('23. Multiple observables on same object with nested objects.', () => {
		var firstProxy = false;
		var secondProxy = false;
		var testing = {"foo":{"bar":"bar"}};
		var pp = ObservableSlim.create(testing, false, function(changes) { 
			if (changes[0].currentPath == "foo.bar" && changes[0].newValue == "foo") {
				firstProxy = true;
			}
		});
		var ppp = ObservableSlim.create(testing, false, function(changes) { 
			if (changes[0].currentPath == "foo.bar" && changes[0].newValue == "foo") {
				secondProxy = true;
			}
		});
		
		ppp.foo.bar = "foo";
		
		expect(firstProxy).to.equal(true);
		expect(secondProxy).to.equal(true);
	});
	
	it('24. Multiple observables on same object with nested objects by passing in a Proxy to `create`.', () => {
		var firstProxy = false;
		var secondProxy = false;
		var testing = {"foo":{"bar":"bar"}};
		var pp = ObservableSlim.create(testing, false, function(changes) { 
			if (changes[0].currentPath == "foo.bar" && changes[0].newValue == "foo") {
				firstProxy = true;
			}
		});
		var ppp = ObservableSlim.create(pp, false, function(changes) { 
			if (changes[0].currentPath == "foo.bar" && changes[0].newValue == "foo") {
				secondProxy = true;
			}
		});
		
		ppp.foo.bar = "foo";
		
		expect(firstProxy).to.equal(true);
		expect(secondProxy).to.equal(true);
	});
	
	it('25. Multiple observables on same object and a Proxy nested within another object.', () => {
	
		var firstObservableTriggered = false;
		var secondObservableTriggered = false;
		var thirdObservableTriggered = false;
	
		var data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":"tree"};
		var p = ObservableSlim.create(data, false, function(changes) { firstObservableTriggered = true; });
		var pp = ObservableSlim.create(p.testing, false, function(changes) { secondObservableTriggered = true; });

		var datatwo = {
			"hey":"world"
			,"other_data":p.testing
		};

		var ppp = ObservableSlim.create(datatwo, false, function(changes) { thirdObservableTriggered = true; });

		p.testing.test.testb = "YOOO";
		
		expect(firstObservableTriggered).to.equal(true);
		expect(secondObservableTriggered).to.equal(true);
		expect(thirdObservableTriggered).to.equal(true);
	
	});
	
	it.skip('26. Multiple observables on same object and a Proxy nested within another object set after initialization.', () => {
	
		var firstObservableTriggered = 0;
		var secondObservableTriggered = 0;
		var thirdObservableTriggered = 0;
	
		var data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":{"tree":"world"}};
		var p = ObservableSlim.create(data, false, function(changes) { firstObservableTriggered++; });
		var pp = ObservableSlim.create(p.testing, false, function(changes) { secondObservableTriggered++; });

		var datatwo = {
			"hey":"world"
			,"other_data":p.testing
			,"new_test":{}
		};

		var ppp = ObservableSlim.create(datatwo, false, function(changes) { thirdObservableTriggered++; });

		ppp.new_test = p.blah;
		
		p.blah.tree = "WORLD";
		
		expect(firstObservableTriggered).to.equal(1);
		expect(secondObservableTriggered).to.equal(0);
		expect(thirdObservableTriggered).to.equal(2);
		expect(p.blah.tree).to.equal("WORLD");
		expect(datatwo.new_test.tree).to.equal("WORLD");
		expect(ppp.new_test.tree).to.equal("WORLD");
	
	});
	
	it('27. Create an observable and then remove it.', () => {
	
		var observed = false;
		var data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":{"tree":"world"}};
		var p = ObservableSlim.create(data, false, function(changes) { 
			observed = true; 
		});
		
		// try removing a proxy that doesn't exist, ensure no errors
		ObservableSlim.remove({});
		
		ObservableSlim.remove(p);
		
		p.testing.test.testb = "HELLO WORLD";
		
		expect(observed).to.equal(false);
	
	});
	
	
	it('28. Pause and resume observables.', () => {
	
		var changeCount = 0;
		var data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":{"tree":"world"}};
		var p = ObservableSlim.create(data, false, function(changes) { changeCount++; });
		
		// try resuming an object that's not a proxy, it should throw an error
		assert(function() { ObservableSlim.pause({}); }, Error, "ObseravableSlim could not pause observable -- matching proxy not found.");
		
		ObservableSlim.pause(p);
		
		p.testing.test.testb = "HELLO WORLD";
		
		// try resuming an object that's not a proxy, it should throw an error
		assert(function() { ObservableSlim.resume({}); }, Error, "ObseravableSlim could not resume observable -- matching proxy not found.");
		
		ObservableSlim.resume(p);
		
		p.testing.test.testb = "HELLO WORLD2";
		
		expect(changeCount).to.equal(1);
	
	});


	it('29. Pause and resume changes on observables', () => {

		var changeCount = 0;
		var data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":{"tree":"world"}};
		var p = ObservableSlim.create(data, false, function(changes) { changeCount++; });

		// try resuming an object that's not a proxy, it should throw an error
		assert(function() { ObservableSlim.pauseChanges({}); }, Error, "ObseravableSlim could not pause changes on observable -- matching proxy not found.");

		ObservableSlim.pauseChanges(p);

		p.testing.test.testb = "HELLO WORLD";
		expect(p.testing.test.testb).to.equal("hello world"); // Because changes are disabled here

		// try resuming an object that's not a proxy, it should throw an error
		assert(function() { ObservableSlim.resumeChanges({}); }, Error, "ObseravableSlim could not resume changes on observable -- matching proxy not found.");

		ObservableSlim.resumeChanges(p);

		p.testing.test.testb = "HELLO WORLD";
		expect(p.testing.test.testb).to.equal("HELLO WORLD"); // Because changes are enabled here

		expect(changeCount).to.equal(2);

	});
	
	it('30. Verify that a mutation on an object observed by two handlers returns the correct new value in both handlers.', () => {
		
		var data = {"foo":"bar"};
		var p = ObservableSlim.create(data, false, function(changes) { 
			expect(p.foo).to.equal("test");
		});
		
		var pp = ObservableSlim.create(p, false, function(changes) { 
			expect(p.foo).to.equal("test");
		});
		
		p.foo = "test";		
	});
	
	
	// When you overwrite a property that points to an object, Observable-Slim will perform a clean-up
	// process to stop watching objects that are no longer a child of the parent (top-most) observed object.
	// However, if a reference to the overwritten object exists somewhere else on the parent observed object, then we
	// still need to watch/observe that object for changes. This test verifies that even after the clean-up process (10 second delay)
	// changes to an overwritten object are still monitored as long as there's another reference to the object.
 	it('31. Clean-up observers of overwritten (orphaned) objects.', (done) => {

		var data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":{"tree":"world"}};
		var dupe = {"duplicate":"is duplicated"};
		data.blah.dupe = dupe;
		data.dupe = dupe;
		var changeCnt = 0;
	
		var p = ObservableSlim.create(data, false, function(changes) { 
			changeCnt++;
			if (changeCnt === 1) {
				expect(p.testing.test).to.be.an("undefined");
			} else if (changeCnt === 2) {
				expect(p.dupe).to.be.an("object");
				expect(p.dupe.duplicate).to.be.an("undefined");
			} else {
				expect(p.blah.dupe.duplicate).to.equal("should catch this change");
				done();
			}
		});
	
		p.testing = {};
		p.dupe = {};
		
	
		setTimeout(function() {
			p.blah.dupe.duplicate = "should catch this change";
		},10500);
	
	});

	it('32. JSON.stringify does not fail on proxyied date.', () => {
			var test = {d: new Date()};
			var p = ObservableSlim.create(test, false, function () {});

			JSON.stringify(p);
	});

	it('33. valueOf does not fail on proxyied date.', () => {
		var test = {d: new Date()};
		var p = ObservableSlim.create(test, false, function () {});

		p.d.valueOf();
	});
	
	it('34. Delete property after calling ObservableSlim.remove does not fail.', () => {
		var test = {foo: 'foo'};
		var p = ObservableSlim.create(test, false, function () {});
		
		ObservableSlim.remove(p);
		delete p.foo;
	});

	it('35. Proxied Date.toString outputs the pristine Date.toString.', () => {
		var test = {d: new Date()};
		var p = ObservableSlim.create(test, false, function () {});

		expect(p.d.toString()).to.equal(test.d.toString());               
	});
	
	it('36. Proxied Date.getTime outputs the pristine Date.getTime.', () => {
		var test = {d: new Date()};
		var p = ObservableSlim.create(test, false, function () {});
		
		expect(p.d.getTime()).to.equal(test.d.getTime());
	});
	
};
