const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '../dist/observable-slim.umd.min.js'), 'utf8');
const sandbox = { window: {}, self: {}, globalThis: {} };
vm.runInNewContext(code, sandbox, { filename: 'observable-slim.umd.min.js' });

const ObservableSlim = sandbox.window.ObservableSlim || sandbox.self.ObservableSlim || sandbox.globalThis.ObservableSlim;
assert.ok(ObservableSlim && typeof ObservableSlim.create === 'function', 'UMD global exposed');
ObservableSlim.create({ user: { name: 'Ada' } }, false, () => {});
console.log('✓ UMD attaches to global (browser-style) ok');
