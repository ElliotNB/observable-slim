const assert = require('node:assert');
const ObservableSlim = require('../dist/observable-slim.umd.min.js');

assert.ok(ObservableSlim && typeof ObservableSlim.create === 'function');
const p = ObservableSlim.create({ user: { name: 'Ada' } }, false, () => {});
p.user.name = 'Ada Lovelace';
console.log('✓ UMD via require ok');