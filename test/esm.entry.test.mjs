import assert from 'node:assert';
import ObservableSlim from 'observable-slim'; // via package "exports"

runSmoke(ObservableSlim);
console.log('✓ ESM via package "import" ok');

function runSmoke(OS) {
	assert.ok(OS && typeof OS.create === 'function');
	const state = { user: { name: 'Ada' }, todos: [] };
	let changes;
	const p = OS.create(state, false, (c) => (changes = c));
	p.user.name = 'Ada Lovelace';
	assert.ok(Array.isArray(changes) && changes.length > 0);
}
