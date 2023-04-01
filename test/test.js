const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const ObservableSlim = require("../observable-slim.js");

describe('Native Proxy', function() {
	suite();
});

function suite() {

	let test, p;

	before(() => {
		// Set to a small number just to exercise the configure method.
		// Below in our tests, we  manually invoke the flushCleanup method.
		ObservableSlim.configure({ cleanupDelayMs: 1 });
	});

	beforeEach(() => {
		test = {};
		p = ObservableSlim.create(test, false, function(changes) { return null; });
	});

	it('1. Read 20,000 objects in under 1 second.', () => {

		const largeArray = [];

		for (let i = 0; i < 20000; i++) {
			largeArray.push({
				"hello":"world"
				,"foo":"bar"
			});
		}

		const largeProxyArr = ObservableSlim.create(largeArray, false, function(changes) {});

		for (let i = 0; i < largeProxyArr.length; i++) {
			const test = largeProxyArr[i].foo;
		}

	}).timeout(1000);

	it('2. Write 20,000 objects in under 2 seconds.', () => {

		const largeArray = [];

		for (let i = 0; i < 20000; i++) {
			largeArray.push({
				"hello":"world"
				,"foo":"bar"
			});
		}

		const largeProxyArr = ObservableSlim.create(largeArray, false, function(changes) {});

		for (let i = 0; i < largeProxyArr.length; i++) {
			largeProxyArr[i].foo = "BAR";
		}

	}).timeout(2000);

	it('3. Add a new string property.', () => {
		ObservableSlim.observe(p, function(changes) {
			expect(changes[0].type).to.equal("add");
			expect(changes[0].newValue).to.equal("world");
		});
		p.hello = "world";
		expect(p.hello).to.equal("world");
		expect(test.hello).to.equal("world");
	});

	it('4. Modify string property value.', () => {
		const test = {"hello":""};
		const p = ObservableSlim.create(test, false, function(changes) {
			expect(changes[0].type).to.equal("update");
			expect(changes[0].newValue).to.equal("WORLD");
		});

		p.hello = "WORLD";
		expect(p.hello).to.equal("WORLD");
		expect(test.hello).to.equal("WORLD");
	});

	it('5.1. Modify string property value with DOM delay included as boolean.', (done) => {
		const test = {"hello":""};
		const p = ObservableSlim.create(test, true, function(changes) {
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

	it('5.2. Modify string property value with DOM delay included as number.', (done) => {
		const test = {"hello":""};
		const p = ObservableSlim.create(test, 25, function(changes) {
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

	it('6. Modify a deeply nested array item.', () => {
		const test = {"hello":{"testing":{"foo":["testing",{"stuff":"hey"},"here"]}}};
		const p = ObservableSlim.create(test, false, function(changes) {

			expect(changes[0].type).to.equal("update");
			expect(changes[0].newValue).to.equal("WORLD");
			expect(changes[0].currentPath).to.equal("hello.testing.foo.1.stuff");
			expect(changes[0].jsonPointer).to.equal("/hello/testing/foo/1/stuff");
		});

		p.hello.testing.foo[1].stuff = "WORLD";
		expect(p.hello.testing.foo[1].stuff).to.equal("WORLD");
		expect(test.hello.testing.foo[1].stuff).to.equal("WORLD");
	});

	it('7. Add a new object property.', () => {
		ObservableSlim.observe(p, function(changes) {
			expect(changes[0].type).to.equal("add");
			expect(changes[0].newValue).to.be.an.instanceof(Object);
		});
		p.testing = {};
		expect(p.testing).to.be.an.instanceof(Object);
		expect(test.testing).to.be.an.instanceof(Object);
	});

	it('8. Set property equal to object.', () => {
		const test = {"testing":false};
		const p = ObservableSlim.create(test, false, function(changes) {
			expect(changes[0].type).to.equal("update");
			expect(changes[0].newValue).to.be.an.instanceof(Object);
		});
		p.testing = {};
		expect(p.testing).to.be.an.instanceof(Object);
		expect(test.testing).to.be.an.instanceof(Object);
	});

	it('9. Add a new nested number property.', () => {
		ObservableSlim.observe(p, function(changes) {
			expect(changes[0].type).to.equal("add");
			expect(changes[0].newValue).to.equal(42);
			expect(changes[0].currentPath).to.equal("testing.blah");
		});
		test.testing = {};
		p.testing.blah = 42;
		expect(p.testing.blah).to.be.equal(42);
		expect(test.testing.blah).to.be.equal(42);
	});

	it('10. Update nested number property.', () => {
		const test = {};
		test.testing = {};
		test.testing.blah = 0;
		const p = ObservableSlim.create(test, false, function(changes) {
			expect(changes[0].type).to.equal("update");
			expect(changes[0].newValue).to.equal(42);
			expect(changes[0].currentPath).to.equal("testing.blah");
		});
		p.testing.blah = 42;
		expect(p.testing.blah).to.be.equal(42);
		expect(test.testing.blah).to.be.equal(42);
	});

	it('11. Set property equal to a new array.', () => {
		const test = {"arr":false};
		const p = ObservableSlim.create(test, false, function(changes) {
			expect(changes[0].type).to.equal("update");
			expect(changes[0].newValue).to.be.an.instanceof(Array);
		});
		p.arr = [];
		expect(p.arr).to.be.an.instanceof(Array);
		expect(test.arr).to.be.an.instanceof(Array);
	});

	it('12. Add a new array property.', () => {
		ObservableSlim.observe(p, function(changes) {
			expect(changes[0].type).to.equal("add");
			expect(changes[0].newValue).to.be.an.instanceof(Array);
		});
		p.arr = [];
		expect(p.arr).to.be.an.instanceof(Array);
		expect(test.arr).to.be.an.instanceof(Array);
	});

	it('13. Push item on to an array.', () => {
		const test = {"arr":[]};
		let change = 0;
		const p = ObservableSlim.create(test, false, function(changes) {
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

	it('14. Unshift item to an array.', () => {
		let change = 0;
		const test = {"arr":["foo bar"]};
		const p = ObservableSlim.create(test, false, function(changes) {
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

		const length = p.arr.unshift("hello world");
		expect(p.arr[0]).to.equal("hello world");
		expect(test.arr[0]).to.equal("hello world");
		expect(p.arr.length).to.equal(2);
		expect(test.arr.length).to.equal(2);
		expect(length).to.equal(2);
	});

	it('15. Pop an item from an array.', () => {
		let change = 0;
		const test = {"arr":["hello world","foo bar"]};
		const p = ObservableSlim.create(test, false, function(changes) {
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

		const lastItem = p.arr[1];
		const popItem = p.arr.pop();

		const popLastSame = (lastItem === popItem);

		expect(p.arr[0]).to.equal("hello world");
		expect(test.arr[0]).to.equal("hello world");
		expect(test.arr.length).to.equal(1);
		expect(p.arr.length).to.equal(1);
		expect(popLastSame).to.equal(true);
	});

	it('16. Splice first item from an array.', () => {
		let change = 0;
		const test = {};
		test.arr = [];
		test.arr.push("hello world");
		const p = ObservableSlim.create(test, false, function(changes) {
			if (change === 0) {
				firstChange = false;
				expect(changes[0].type).to.equal("delete");
				expect(changes[0].previousValue).to.equal("hello world");
			} else if (change === 1) {
				expect(changes[0].type).to.equal("update");
				expect(changes[0].property).to.equal("length");
			}
			change++;
		});
		p.arr.splice(0,1);
		expect(test.arr.length).to.equal(0);
		expect(p.arr.length).to.equal(0);
	});

	it('17. Insert item into an array using splice.', () => {
		let change = 0;
		const test = {"arr":["hello world","foo bar","sunday","sunday"]};
		const p = ObservableSlim.create(test, false, function(changes) {
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

		const val = p.arr.splice(1,0, "inserting");

		expect(test.arr.length).to.equal(5);
		expect(p.arr.length).to.equal(5);
		expect(test.arr[1]).to.equal("inserting");
		expect(p.arr[1]).to.equal("inserting");
		expect(val.length).to.equal(0);
	});

	it('18. Insert new item and remove two items from an array using splice.', () => {
		let change = 0;
		const test = {"arr":["hello world","foo bar","sunday","tuesday"]};
		const p = ObservableSlim.create(test, false, function(changes) {});

		const val = p.arr.splice(1,2, "inserting");

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

	it('19. Shift the first item off an array.', () => {
		let change = 0;
		const test = {"arr":["foo bar","hello world"]};
		const p = ObservableSlim.create(test, false, function(changes) {
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

		const removedItem = p.arr.shift();
		expect(p.arr[0]).to.equal("hello world");
		expect(test.arr[0]).to.equal("hello world");
		expect(p.arr.length).to.equal(1);
		expect(test.arr.length).to.equal(1);
		expect(removedItem).to.equal("foo bar");
	});

	it('20. currentPath is updated correctly when the position of an Object in an Array changes.', () => {

		let change = 0;
		const test = [{},{"foo":"test"}];
		const p = ObservableSlim.create(test, false, function(changes) {

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

			change++;

		});

		p.splice(0, 1);
		p[0].foo = "bar";

		expect(test.length).to.equal(1);
		expect(test[0].foo).to.equal("bar");

	});


	it('21. Delete a property.', () => {
		ObservableSlim.create(test, function(changes) {
			expect(changes[0].type).to.equal("delete");
			expect(changes[0].property).to.equal("hello");
		});

		test.hello = "hello";
		delete p.hello;

		expect(test.hello).to.be.an('undefined');
		expect(p.hello).to.be.an('undefined');
	});

	it('22. isProxy() check.', () => {
		expect(ObservableSlim.isProxy(p)).to.be.equal(true);
	});

	it('23. getTarget() check.', () => {
		let isSameObject = false;
		if (ObservableSlim.getTarget(p) === test) isSameObject = true;
		expect(isSameObject).to.be.equal(true);
	});

	it('24. getParent() on nested object.', () => {
		p.hello = {};
		p.hello.blah = {"found":"me"};
		test.hello.blah.foo = {};
		const target = p.hello.blah.foo;
		expect(ObservableSlim.getParent(target).found).to.equal("me");
	});

	it('25. Multiple observables on same object.', () => {
		const test = {"dummy":"blah"};
		let firstProxy = false;
		let secondProxy = false;
		const pp = ObservableSlim.create(test, false, function(changes) {
			if (changes[0].currentPath == "dummy" && changes[0].newValue == "foo") {
				firstProxy = true;
			}
		});
		const ppp = ObservableSlim.create(pp, false, function(changes) {
			if (changes[0].currentPath == "dummy" && changes[0].newValue == "foo") {
				secondProxy = true;
			}
		});

		ppp.dummy = "foo";

		expect(firstProxy).to.equal(true);
		expect(secondProxy).to.equal(true);
	});

	it('26. Multiple observables on same object with nested objects.', () => {
		let firstProxy = false;
		let secondProxy = false;
		const testing = {"foo":{"bar":"bar"}};
		const pp = ObservableSlim.create(testing, false, function(changes) {
			if (changes[0].currentPath == "foo.bar" && changes[0].newValue == "foo") {
				firstProxy = true;
			}
		});
		const ppp = ObservableSlim.create(testing, false, function(changes) {
			if (changes[0].currentPath == "foo.bar" && changes[0].newValue == "foo") {
				secondProxy = true;
			}
		});

		ppp.foo.bar = "foo";

		expect(firstProxy).to.equal(true);
		expect(secondProxy).to.equal(true);
	});

	it('27. Multiple observables on same object with nested objects by passing in a Proxy to `create`.', () => {
		let firstProxy = false;
		let secondProxy = false;
		const testing = {"foo":{"bar":"bar"}};
		const pp = ObservableSlim.create(testing, false, function(changes) {
			if (changes[0].currentPath == "foo.bar" && changes[0].newValue == "foo") {
				firstProxy = true;
			}
		});
		const ppp = ObservableSlim.create(pp, false, function(changes) {
			if (changes[0].currentPath == "foo.bar" && changes[0].newValue == "foo") {
				secondProxy = true;
			}
		});

		ppp.foo.bar = "foo";

		expect(firstProxy).to.equal(true);
		expect(secondProxy).to.equal(true);
	});

	it('28. Multiple observables on same object and a Proxy nested within another object.', () => {

		let firstObservableTriggered = false;
		let secondObservableTriggered = false;
		let thirdObservableTriggered = false;

		const data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":"tree"};
		const p = ObservableSlim.create(data, false, function(changes) { firstObservableTriggered = true; });
		const pp = ObservableSlim.create(p.testing, false, function(changes) { secondObservableTriggered = true; });

		const datatwo = {
			"hey":"world"
			,"other_data":p.testing
		};

		const ppp = ObservableSlim.create(datatwo, false, function(changes) { thirdObservableTriggered = true; });

		p.testing.test.testb = "YOOO";

		expect(firstObservableTriggered).to.equal(true);
		expect(secondObservableTriggered).to.equal(true);
		expect(thirdObservableTriggered).to.equal(true);

	});

	it('29. Multiple observables on same object and a Proxy nested within another object set after initialization.', () => {

		let firstObservableTriggered = 0;
		let secondObservableTriggered = 0;
		let thirdObservableTriggered = 0;

		const data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":{"tree":"world"}};
		const p = ObservableSlim.create(data, false, function(changes) { firstObservableTriggered++; });
		const pp = ObservableSlim.create(p.testing, false, function(changes) { secondObservableTriggered++; });

		const datatwo = {
			"hey":"world"
			,"other_data":p.testing
			,"new_test":{}
		};

		const ppp = ObservableSlim.create(datatwo, false, function(changes) { thirdObservableTriggered++; });

		ppp.new_test = p.blah;

		p.blah.tree = "WORLD";

		expect(firstObservableTriggered).to.equal(1);
		expect(secondObservableTriggered).to.equal(0);
		expect(thirdObservableTriggered).to.equal(2);
		expect(p.blah.tree).to.equal("WORLD");
		expect(datatwo.new_test.tree).to.equal("WORLD");
		expect(ppp.new_test.tree).to.equal("WORLD");

	});

	it('30. Create an observable and then remove it.', () => {

		let observed = false;
		const data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":{"tree":"world"}};
		const p = ObservableSlim.create(data, false, function(changes) {
			observed = true;
		});

		// try removing a proxy that doesn't exist, ensure no errors
		ObservableSlim.remove({});

		ObservableSlim.remove(p);

		p.testing.test.testb = "HELLO WORLD";

		expect(observed).to.equal(false);

	});


	it('31. Pause and resume observables.', () => {

		let changeCount = 0;
		const data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":{"tree":"world"}};
		const p = ObservableSlim.create(data, false, function(changes) { changeCount++; });

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


	it('32. Pause and resume changes on observables', () => {

		let changeCount = 0;
		const data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":{"tree":"world"}};
		const p = ObservableSlim.create(data, false, function(changes) { changeCount++; });

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

	it('33. Verify that a mutation on an object observed by two handlers returns the correct new value in both handlers.', () => {

		const data = {"foo":"bar"};
		const p = ObservableSlim.create(data, false, function(changes) {
			expect(p.foo).to.equal("test");
		});

		const pp = ObservableSlim.create(p, false, function(changes) {
			expect(p.foo).to.equal("test");
		});

		p.foo = "test";
	});


	// When you overwrite a property that points to an object, Observable-Slim will perform a clean-up
	// process to stop watching objects that are no longer a child of the parent (top-most) observed object.
	// However, if a reference to the overwritten object exists somewhere else on the parent observed object, then we
	// still need to watch/observe that object for changes. This test verifies that even after the clean-up process (10 second delay)
	// changes to an overwritten object are still monitored as long as there's another reference to the object.
 	it('34. Clean-up observers of overwritten (orphaned) objects.', (done) => {

		const data = {"testing":{"test":{"testb":"hello world"},"testc":"hello again"},"blah":{"tree":"world"}};
		const dupe = {"duplicate":"is duplicated"};
		data.blah.dupe = dupe;
		data.dupe = dupe;
		let changeCnt = 0;

		const p = ObservableSlim.create(data, false, function(changes) {
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

		// Force the cleanup to run now
		ObservableSlim.flushCleanup();

		p.blah.dupe.duplicate = "should catch this change";

	});

	it('35. JSON.stringify does not fail on proxied date.', () => {
		const test = {d: new Date()};
		const p = ObservableSlim.create(test, false, function () {});

		JSON.stringify(p);
	});

	it('36. valueOf does not fail on proxied date.', () => {
		const test = {d: new Date()};
		const p = ObservableSlim.create(test, false, function () {});

		p.d.valueOf();
	});

	it('37. Delete property after calling ObservableSlim.remove does not fail.', () => {
		const test = {foo: 'foo'};
		const p = ObservableSlim.create(test, false, function () {});

		ObservableSlim.remove(p);
		delete p.foo;
	});

	it('38. Proxied Date.toString outputs the pristine Date.toString.', () => {
		const test = {d: new Date()};
		const p = ObservableSlim.create(test, false, function () {});

		expect(p.d.toString()).to.equal(test.d.toString());
	});

	it('39. Proxied Date.getTime outputs the pristine Date.getTime.', () => {
		const test = {d: new Date()};
		const p = ObservableSlim.create(test, false, function () {});

		expect(p.d.getTime()).to.equal(test.d.getTime());
	});

	it('40. __targetPosition helper is non-enumerable.', () => {

		let found = false;

		const test = {d: new Date()};
		const p = ObservableSlim.create(test, false, function () {});

		for (const prop in test) {
			if (prop === "__targetPosition") found = true;
		}

		const keys = Object.keys(test);
		let i = keys.length;
		while (i--) {
			if (keys[i] == "__targetPosition") found = true;
		}

		expect(found).to.equal(false);

	});

	it('41. Verify getPath returns correct path.', () => {
		const data = {"foo":"bar","arr":[{"test":{}}],"test":{"deeper":{}}};
		const p = ObservableSlim.create(data, false, function(changes) {});

		expect(ObservableSlim.getPath(p.test.deeper)).to.equal("test.deeper");
		expect(ObservableSlim.getPath(p.arr[0].test)).to.equal("arr.0.test");

	});

	it('42. Array does not enumerate __length.', () => {
		const largeArray = [];

		for (let i = 0; i < 5; i++) {
			largeArray.push({
				"hello":"world"
				,"foo":"bar"
			});
		}

		const proxyArr = ObservableSlim.create(largeArray, false, function(changes) {});

		const keys = Array.from(proxyArr.keys());
		expect(keys.every(item => !Number.isNaN(item))).to.be.true;
	});

	it('43. Refresh length tracking when creating a second observable on the same array.', () => {
		// Start with an array and create the first observable
		const arr = [1, 2, 3];
		const p1 = ObservableSlim.create(arr, false, function () {});

		// Mutate the array directly (not via proxy) so internal length tracking must be refreshed on next create
		arr.push(4, 5); // arr.length is now 5

		// Create a second observable for the same array; internal length baseline should initialize to 5
		let sawLengthUpdate = false;
		const p2 = ObservableSlim.create(arr, false, function (changes) {
			if (changes[0].property === 'length') {
				expect(changes[0].previousValue).to.equal(5);
				expect(changes[0].newValue).to.equal(6);
				sawLengthUpdate = true;
			}
		});

		// Trigger a length change through the second proxy
		p2.push(6);

		expect(sawLengthUpdate).to.equal(true);
	});

	// This test ensures that when a property is deleted via one proxy, ObservableSlim
	// propagates the delete to *other* proxies for the same target by setting `dupProxy`
	// and performing `delete currentTargetProxy[b].proxy[property];`. Proves that every observable
	// created for the target in the test (two of them) get notified exactly once when a 
	// delete happens via one proxy, and that the notification reached the other proxy 
	// through the dupProxy propagation path.
	it('44. Propagates delete to sibling proxies using dupProxy (no infinite loop)', function () {
		const target = { a: 1, b: 2 };

		let calls1 = 0;
		let calls2 = 0;
		let changes1 = null;
		let changes2 = null;

		// Create two separate proxies observing the same target.
		// This sets up targetToProxies[target] with two proxy records.
		const proxy1 = ObservableSlim.create(target, false, (changes) => { calls1++; changes1 = changes; });
		const proxy2 = ObservableSlim.create(target, false, (changes) => { calls2++; changes2 = changes; });

		// Sanity: both proxies see the same properties initially.
		assert.strictEqual(proxy1.a, 1);
		assert.strictEqual(proxy2.a, 1);

		// Trigger delete via proxy1. Internally, in deleteProperty trap:
		// - records the change on proxy1,
		// - deletes from the underlying target,
		// - iterates currentTargetProxy list,
		// - sets dupProxy = otherProxy,
		// - executes: delete otherProxy[property];
		delete proxy1.a;

		// Both observers should have been called exactly once (no infinite loop):
		assert.strictEqual(calls1, 1, 'observer for proxy1 should be called once');
		assert.strictEqual(calls2, 1, 'observer for proxy2 should be called once');

		// Verify change shape for proxy1 (the initiator)
		assert.ok(Array.isArray(changes1) && changes1.length === 1, 'proxy1 should receive a single change');
		assert.strictEqual(changes1[0].type, 'delete');
		assert.strictEqual(changes1[0].property, 'a');
		assert.strictEqual(changes1[0].newValue, null);
		// previousValue is implementation-dependent across proxies due to timing; do not assert it here.

		// Verify change reached proxy2 specifically via the dupProxy propagation
		assert.ok(Array.isArray(changes2) && changes2.length === 1, 'proxy2 should receive a single propagated change');
		assert.strictEqual(changes2[0].type, 'delete');
		assert.strictEqual(changes2[0].property, 'a');
		assert.strictEqual(changes2[0].newValue, null);

		// Property should be gone from both proxies and the underlying target
		assert.strictEqual('a' in proxy1, false);
		assert.strictEqual('a' in proxy2, false);
		assert.strictEqual(Object.prototype.hasOwnProperty.call(target, 'a'), false);
	});

	it('45. getPath returns dotted and JSON Pointer, and updates after index shift.', () => {
		const data = { foo: { bar: [ { baz: { qux: 1 } } ] } };
		const p = ObservableSlim.create(data, false, function () {});

		const leaf = p.foo.bar[0].baz; // proxy for {...}

		// Basic dotted path and JSON Pointer
		expect(ObservableSlim.getPath(leaf)).to.equal('foo.bar.0.baz');
		expect(ObservableSlim.getPath(leaf, { jsonPointer: true })).to.equal('/foo/bar/0/baz');

		// Move original element one slot to the right
		p.foo.bar.unshift({ baz: { qux: 0 } });

		// Path for the same proxy should reflect new array index
		expect(ObservableSlim.getPath(leaf)).to.equal('foo.bar.1.baz');

		// Error branch: non-proxy argument
		expect(() => ObservableSlim.getPath({})).to.throw(/expects a proxy/i);
	});

	it('46. getParent returns correct ancestors (depths 1 & 2) and throws on non-proxy.', () => {
		const data = { foo: { bar: [ { baz: { qux: 1 } } ] } };
		const p = ObservableSlim.create(data, false, function () {});

		const leaf = p.foo.bar[0].baz;

		// Parent at depth 1 is the array element object
		const parent1 = ObservableSlim.getParent(leaf);
		expect(parent1).to.equal(p.foo.bar[0]);
		expect(ObservableSlim.getPath(parent1)).to.equal('foo.bar.0');

		// Parent at depth 2 is the array itself
		const parent2 = ObservableSlim.getParent(leaf, 2);
		expect(parent2).to.equal(p.foo.bar);

		// Error branch: non-proxy argument
		expect(() => ObservableSlim.getParent({}, 1)).to.throw(/expects a proxy/i);
	});

	it('47. Internal Symbols: TARGET returns original object, IS_PROXY returns true', () => {
		// Only applicable with native Proxy behavior
		const data = { x: 1 };
		const proxy = ObservableSlim.create(data, false, function () {});

		const { TARGET, IS_PROXY } = ObservableSlim.symbols;

		expect(proxy[TARGET]).to.equal(data); // same reference as original target
		expect(proxy[IS_PROXY]).to.equal(true);

		// Sanity: Symbols are not enumerated via Object.keys
		expect(Object.keys(proxy).includes(String(TARGET))).to.equal(false);
		expect(Object.keys(proxy).includes(String(IS_PROXY))).to.equal(false);
	});

	it('48. observe() on a nested proxy is a no-op (no matching parentProxy)', () => {
		// Build a nested structure
		const data = { a: { b: { c: 1 } } };
		const root = ObservableSlim.create(data, false, function () {});

		// Get a nested proxy (not a parentProxy in observables[])
		const nested = root.a.b;

		// Attempt to register an observer on the nested proxy – this should do nothing
		let called = false;
		ObservableSlim.observe(nested, () => { called = true; });

		// Mutate the nested object; if observe() had attached, this would flip `called`
		nested.c = 2;

		expect(called).to.equal(false, 'observe() on nested proxy should not attach an observer');
		expect(root.a.b.c).to.equal(2);
		expect(data.a.b.c).to.equal(2);
	});

	it('49. Pause/resume (+ changes) throw for a removed (previously valid) proxy', () => {
		const data = { x: 1 };
		const proxy = ObservableSlim.create(data, false, function () {});

		// Remove the observable so it no longer exists in `observables[]`
		ObservableSlim.remove(proxy);

		// Now each should hit the "foundMatch === false" branch and throw
		expect(() => ObservableSlim.pause(proxy)).to.throw(/could not pause observable/i);
		expect(() => ObservableSlim.resume(proxy)).to.throw(/could not resume observable/i);
		expect(() => ObservableSlim.pauseChanges(proxy)).to.throw(/could not pause changes/i);
		expect(() => ObservableSlim.resumeChanges(proxy)).to.throw(/could not resume changes/i);
	});


	it('50. Cleanup removes last proxy record for overwritten dynamic object and skips unproxied descendants', function (done) {

		const prevRIC = global.requestIdleCallback;
		const prevCIC = global.cancelIdleCallback;
		let cancelCalled = 0;

		// Return a fake handle and DO NOT invoke the callback here;
		// we want cleanupTimer to stay truthy so flushCleanup() cancels it.
		global.requestIdleCallback = function(cb, opts) { return 12345; };
		global.cancelIdleCallback = function(id) { expect(id).to.equal(12345); cancelCalled++; };

		const data = {};
		let calls = 0;
		const p = ObservableSlim.create(data, false, () => { calls++; });

		// Assign a nested object at runtime; only the top-level (parent) gets proxied immediately.
		const oldParent = { child: { grand: { leaf: 1 } } };
		p.parent = oldParent;            // calls += 1
		p.parent = { replaced: true };   // calls += 1 and schedules 10s cleanup for oldParent

		// Force the cleanup to run now
		ObservableSlim.flushCleanup();

		expect(cancelCalled).to.equal(1);
		global.requestIdleCallback = prevRIC;
		global.cancelIdleCallback = prevCIC;

		// After cleanup runs, mutating the old unproxied descendants should NOT notify.
		const before = calls;
		oldParent.child.grand.leaf = 2; // raw object (no proxy), should not notify p

		// Tiny delay to catch any accidental notifications
		setTimeout(() => {
			expect(calls).to.equal(before);
			done();
		}, 20);
	});

	it('51. Cleanup preserves other observables proxies (does not delete map when entries remain)', function () {

		// Two observables over the same target to ensure the proxy list has >1 entry.
		const root = { parent: { child: 1 } };
		let calls1 = 0, calls2 = 0;

		const p1 = ObservableSlim.create(root, false, () => { calls1++; });
		const p2 = ObservableSlim.create(root, false, () => { calls2++; });

		// Keep a handle to the *old* parent proxy from p2.
		const oldParentProxyForP2 = p2.parent;

		// Overwrite via p1; this schedules cleanup that will remove p1's entry for the old parent,
		// but p2's entry should remain (so the map is not deleted).
		p1.parent = { newChild: 2 }; // calls1 += 1, and via dupProxy propagation calls2 += 1

		// Force the cleanup to run now
		ObservableSlim.flushCleanup();

		const before2 = calls2;

		// Mutate the old parent *through p2's proxy*; p2 should still be notified,
		// proving the entry for that object wasn't deleted globally.
		oldParentProxyForP2.child = 42;

		expect(calls2).to.equal(before2 + 1);
		// p1 should not be notified by this last mutation on the orphaned proxy
		expect(calls1).to.equal(1);
	});

	it('52. remove() detaches one observable but preserves target entries when others remain', () => {
		// Have nested structure so multiple proxyRefs exist
		const data = { tree: { leaf: 1 }, list: [{ v: 1 }, { v: 2 }] };

		let calls1 = 0;
		let calls2 = 0;

		const p1 = ObservableSlim.create(data, false, () => { calls1++; });
		const p2 = ObservableSlim.create(data, false, () => { calls2++; });

		// Sanity check: both observables get notified on a change before removal
		p2.tree.leaf = 2;
		expect(calls1).to.equal(1);
		expect(calls2).to.equal(1);

		// Remove only the first observable. Internally this will splice p1's entries
		// from targetToProxies arrays but must NOT delete them entirely because p2 remains.
		ObservableSlim.remove(p1);

		// Further mutations should notify p2 only, proving arr.length !== 0 branch was taken.
		p2.tree.leaf = 3;
		p2.list[1].v = 99;

		expect(calls1).to.equal(1); // no new calls to the removed observable
		expect(calls2).to.equal(3); // two additional notifications for p2
	});

	it('53. _getProperty: traverses into undefined mid-path (key with dot) and triggers falsy branch', () => {
		const data = {};
		const p = ObservableSlim.create(data, false, function () {});

		// Create a property whose name contains a dot.
		p['a.b'] = { child: { leaf: 1 } };

		const leaf = p['a.b'].child; // proxied object

		// Because _getProperty splits on '.', it treats 'a.b' as ['a','b'].
		// After resolving 'a' (undefined), the next step runs with prev = undefined,
		// exercising the `prev ? prev[curr] : undefined` falsy branch and returning undefined.
		const parent = ObservableSlim.getParent(leaf);
		expect(parent).to.equal(undefined);

		// Sanity: normal non-dotted paths still work
		p.normal = { kid: {} };
		expect(ObservableSlim.getParent(p.normal.kid)).to.equal(p.normal);
	});

	it('54. _getProperty empty-path, normal traversal, and falsy mid-path branches.', () => {
		// Build a simple nested structure
		const data = { top: { mid: { leaf: 1 } } };
		const p = ObservableSlim.create(data, false, function () {});

		// --- Empty path branch: getParent(top-level-child) should return the root proxy.
		// This hits `_getProperty(observable.parentProxy, "")` -> returns obj itself.
		const topChild = p.top;
		expect(ObservableSlim.getParent(topChild)).to.equal(p);

		// --- Normal traversal branch: reducer walks the path successfully
		// Depth 1 parent of `p.top.mid` is `p.top`; depth 2 parent is the root proxy.
		const mid = p.top.mid;
		expect(ObservableSlim.getParent(mid, 1)).to.equal(p.top);
		expect(ObservableSlim.getParent(mid, 2)).to.equal(p);

		// --- Falsy mid-path branch: a dotted property name makes the reducer hit `prev ? prev[curr] : undefined`
		// because it splits "a.b" into ["a","b"], and "a" does not exist.
		p['a.b'] = { child: { n: 1 } };
		const child = p['a.b'].child; // proxied object
		const parent = ObservableSlim.getParent(child);
		expect(parent).to.equal(undefined); // reducer returned undefined mid-way
	});


	it('55. create(): handles self-referential graph (no stack overflow).', () => {
		// Build a direct self-cycle before creating the observable.
		const data = {};
		data.self = data;

		// If infinite recursion is possible, this throws RangeError: Maximum call stack size exceeded.
		expect(() => ObservableSlim.create(data, false, function () {})).to.not.throw();
	});

	it('56. Cleanup: orphaned cyclic object does not cause stack overflow.', function (done) {

		// Root observable
		const root = ObservableSlim.create({}, false, function () {});

		// Create an object that contains a cycle: old.child.parent -> old
		const old = { child: {} };
		old.child.parent = old;

		// Attach cyclic object to the observed graph, then overwrite to schedule cleanup
		root.holder = old;            // attaches proxies beneath holder
		root.holder = { replaced: 1 } // schedules cleanup in ~10s for `old`

		// If cleanup DFS isn't cycle-safe, the cleanup will overflow the stack.
		// Force the cleanup to run now
		ObservableSlim.flushCleanup();
		done();
	});

	it('57. cleanupOrphan unwraps proxied child and detaches records.', function (done) {

		// Root observable we'll be checking for stray notifications.
		let rootCalls = 0;
		const rootData = {};
		const rootProxy = ObservableSlim.create(rootData, false, function () { rootCalls++; });

		// A separate, "foreign" observable that we'll reference via a proxy inside the orphan.
		const foreignTarget = { x: 1 };
		const foreignProxy  = ObservableSlim.create(foreignTarget, false, function () {});

		// Build an object that contains a *proxy* as a child property.
		// Important: assign the proxy onto a plain object (not via a proxy set trap),
		// so the raw object graph literally stores a proxy value.
		const orphan = { inner: 1 };
		orphan.child = foreignProxy;

		// Attach the orphan under the root observable.
		rootProxy.holder = orphan;

		// Force the creation of a proxy record for the foreign target under *this* observable
		// by accessing the nested property before we overwrite it. This makes the later cleanup
		// responsible for removing that record.
		void rootProxy.holder.child;

		// Overwrite to schedule the cleanup of the old subtree (`orphan`).
		rootProxy.holder = { replaced: true };

		// Force the cleanup to run now
		ObservableSlim.flushCleanup();

		const before = rootCalls;

		// Mutate the foreign object via its own proxy. If cleanup failed to unwrap proxies
		// and therefore didn’t detach the foreign target, the root would still get notified
		// via dupProxy propagation.
		foreignProxy.x = 2;

		expect(rootCalls).to.equal(before);
		done();
	});


};
