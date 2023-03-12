// Uses your package "exports" (require -> dist/observable-slim.cjs)
const assert = require('assert');
const ObservableSlim = require('observable-slim');

function runSmoke(API) {
	// sanity: make sure we loaded the right thing
	assert.ok(API && typeof API.create === 'function', 'ObservableSlim API not loaded');

	const state = { user: { name: 'Ada Lovelace' }, todos: [] };
	const p = API.create(state, false);

	// basic proxy + helpers
	assert.strictEqual(API.isProxy(p), true, 'isProxy(p) should be true');
	assert.strictEqual(API.getTarget(p), state, 'getTarget(p) should return the original state');

	// mutate through proxy and verify it hits the original
	p.user.name = 'Ada';
	p.todos.push({ title: 'Write tests', done: false });

	// path/parent
	const child = p.user;
	assert.strictEqual(API.getPath(child), 'user', 'getPath(child) === "user"');
	assert.strictEqual(API.getParent(child), p, 'getParent(child) === proxy');

	// symbol capabilities should be present and usable at runtime
	const { IS_PROXY, TARGET, PATH, PARENT } = API.symbols;
	assert.strictEqual(p[IS_PROXY], true, 'p[IS_PROXY] === true');
	assert.ok(p[TARGET] && typeof p[TARGET] === 'object', 'p[TARGET] is object');
	assert.strictEqual(typeof p[PATH], 'string', 'p[PATH] is string');
	assert.strictEqual(typeof p[PARENT], 'function', 'p[PARENT] is function');

	// final state shape check (use deep)
	const expected = {
		user: { name: 'Ada' },
		todos: [{ title: 'Write tests', done: false }],
	};
	assert.deepStrictEqual(state, expected, 'state mutated through proxy should match expected');
}

runSmoke(ObservableSlim);
console.log('✓ CJS via package entry OK');
