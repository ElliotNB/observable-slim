import assert from 'node:assert';
import mod from '../dist/observable-slim.mjs'; // direct file (ESM)
const ObservableSlim = mod?.default ?? mod;

runSmoke(ObservableSlim);
console.log('✓ ESM direct dist/observable-slim.mjs ok');

function runSmoke(OS) {
	assert.ok(typeof OS.create === 'function');
	const p = OS.create({ user: { name: 'Ada' } }, false, () => {});
	p.user.name = 'Ada Lovelace';
}
