var expect = require('chai').expect;
var ObservableSlim = require("../observable-slim.js");

describe('observable-slim.js', _ => {
  
  var test, p;
  
  beforeEach(() => { 
	test = {};
	p = ObservableSlim.create(test, false, function(changes) { return null; });
  });
  
  it('Add a new string property.', () => {
	ObservableSlim.observe(p, function(changes) {
		expect(changes[0].type).to.equal("add");
		expect(changes[0].newValue).to.equal("world");
	});
	p.hello = "world";
    expect(p.hello).to.equal("world");
    expect(test.hello).to.equal("world");
  });  
  
  it('Modify string property value.', () => {
	ObservableSlim.observe(p, function(changes) {
		expect(changes[0].type).to.equal("update");
		expect(changes[0].newValue).to.equal("WORLD");
	});
	
	test.hello = "world";
	p.hello = "WORLD";
    expect(p.hello).to.equal("WORLD");
    expect(test.hello).to.equal("WORLD");
  });
  
  it('Add a new object property.', () => {
	ObservableSlim.observe(p, function(changes) {
		expect(changes[0].type).to.equal("add");
		expect(changes[0].newValue).to.be.an.instanceof(Object);
	});
	p.testing = {};
    expect(p.testing).to.be.an.instanceof(Object);
    expect(test.testing).to.be.an.instanceof(Object);
  });
  
  it('Add a new nested number property.', () => {
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
  
  it('Add a new array property.', () => {
	ObservableSlim.observe(p, function(changes) {
		expect(changes[0].type).to.equal("add");
		expect(changes[0].newValue).to.be.an.instanceof(Array);
	});
	p.arr = [];
    expect(p.arr).to.be.an.instanceof(Array);
    expect(test.arr).to.be.an.instanceof(Array);
  });
  
  it('Add item to array.', () => {
	ObservableSlim.observe(p, function(changes) {
		expect(changes[0].type).to.equal("add");
		expect(changes[0].newValue).to.equal("hello world");
		expect(changes[0].currentPath).to.equal("arr");
		expect(changes[0].property).to.equal("0");
	});
	test.arr = [];
	p.arr.push("hello world");
    expect(p.arr[0]).to.equal("hello world");
    expect(test.arr[0]).to.equal("hello world");
  });
  
  
})