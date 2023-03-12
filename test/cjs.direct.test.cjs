// Loads the file directly to bypass package "exports"
const assert = require('assert');
const ObservableSlim = require('../dist/observable-slim.cjs');

function runSmoke(API) {
	const state = { user: { name: 'Ada Lovelace' }, todos: [] };
	const p = API.create(state, false);

	API.observe(p, (changes) => {
		// ensure we get an array of change records
		assert.ok(Array.isArray(changes));
	});

	p.user.name = 'Ada';
	assert.strictEqual(API.getTarget(p), state);
	assert.deepStrictEqual(state.user, { name: 'Ada' });
}

runSmoke(ObservableSlim);
console.log('✓ CJS direct file OK');
