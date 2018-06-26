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
		var p = ObservableSlim.create(test, false, function(changes) {
			expect(changes[0].type).to.equal("add");
			expect(changes[0].newValue).to.equal("hello world");
			expect(changes[0].currentPath).to.equal("arr");
			expect(changes[0].property).to.equal("0");
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
				expect(changes[0].currentPath).to.equal("arr");
				expect(changes[0].property).to.equal("1");
			} else if (change === 1) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].newValue).to.equal("hello world");
				expect(changes[0].previousValue).to.equal("foo bar");
				expect(changes[0].currentPath).to.equal("arr");
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
				expect(changes[0].currentPath).to.equal("arr");
				
			} else if (change === 1) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].property).to.equal("length");
				expect(changes[0].newValue).to.equal(1);
				expect(changes[0].previousValue).to.equal(2);
				expect(changes[0].currentPath).to.equal("arr");
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
				expect(changes[0].currentPath).to.equal("arr");
			} else if (change === 1) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].property).to.equal("2");
				expect(changes[0].newValue).to.equal("foo bar");
				expect(changes[0].previousValue).to.equal("sunday");
				expect(changes[0].currentPath).to.equal("arr");
			} else if (change === 2) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].property).to.equal("1");
				expect(changes[0].newValue).to.equal("inserting");
				expect(changes[0].previousValue).to.equal("foo bar");
				expect(changes[0].currentPath).to.equal("arr");
			}
			change++
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
				expect(changes[0].currentPath).to.equal("arr");
				
			} else if (change === 1) {
				expect(changes[0].type).to.equal("delete");
				expect(changes[0].property).to.equal("1");
				expect(changes[0].newValue).to.equal(null);
				expect(changes[0].previousValue).to.equal("hello world");
				expect(changes[0].currentPath).to.equal("arr");
			} else if (change === 2) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].property).to.equal("length");
				expect(changes[0].newValue).to.equal(1);
				expect(changes[0].previousValue).to.equal(2);
				expect(changes[0].currentPath).to.equal("arr");
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
	
	it('17. Delete a property (not supported with ES5 polyfill).', () => {
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

	it('18. __isProxy check', () => {
		expect(p.__isProxy).to.be.equal(true);
	});
	
	it('19. __getTarget check', () => {
		var isSameObject = false;
		if (p.__getTarget === test) isSameObject = true;
		expect(isSameObject).to.be.equal(true);
	});
	
	it('20. __getParent on nested object (not supported with ES5 polyfill).', () => {
		if (global.Proxy === global.NativeProxy) {
			p.hello = {};
			p.hello.blah = {"found":"me"};
			test.hello.blah.foo = {};
			var target = p.hello.blah.foo;
			expect(target.__getParent().found).to.equal("me");
		}
	});
	
	it('21. Multiple observables on same object.', () => {
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
	
	it('22. Multiple observables on same object with nested objects.', () => {
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
	
	it('23. Multiple observables on same object with nested objects by passing in a Proxy to `create`.', () => {
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
	
	it('24. Multiple observables on same object and a Proxy nested within another object.', () => {
	
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
	
	it.skip('25. Multiple observables on same object and a Proxy nested within another object set after initialization.', () => {
	
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
	
	it('26. Create an observable and then remove it.', () => {
	
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
	
	
	it('27. Pause and resume observables.', () => {
	
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


	it('28. Pause and resume changes on observables', () => {

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
	
	
	// This test currently does not have an expectation or assertion. For now it simply
	// ensures that the garbage clean-up code runs and that the garbage clean-up doesn't throw an error.
 	it('29. Clean-up observers of overwritten (orphaned) objects.', (done) => {

		var data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":{"tree":"world"}};
		var p = ObservableSlim.create(data, false, function(changes) { 
			return null;
		});
	
		p.testing = {};
	
		setTimeout(function() {
			done();
		},10000);
	
	});
	

};