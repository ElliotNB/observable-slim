# :eyes: Observable Slim

[![Build Status](https://app.travis-ci.com/ElliotNB/observable-slim.svg?branch=master)](https://app.travis-ci.com/ElliotNB/observable-slim) [![Coverage Status](https://coveralls.io/repos/github/ElliotNB/observable-slim/badge.svg)](https://coveralls.io/github/ElliotNB/observable-slim) [![Monthly Downloads](https://img.shields.io/npm/dm/observable-slim.svg)](https://www.npmjs.com/package/observable-slim)

https://github.com/elliotnb/observable-slim

*A small, dependency‑free deep observer for plain objects and arrays, powered by ES2015 Proxies.*

> Watches your data (including all nested children) and emits structured change records (`add` / `update` / `delete`) with the property name, a dot‑path and RFC6901 JSON Pointer, previous/new values, and the originating proxy.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API](#api)
  - [`ObservableSlim.create(target, domDelay, observer?)`](#observableslimcreatetarget-domdelay-observer)
  - [`ObservableSlim.observe(proxy, observer)`](#observableslimobserveproxy-observer)
  - [`ObservableSlim.pause(proxy)`](#observableslimpauseproxy--resumeproxy)[ / ](#observableslimpauseproxy--resumeproxy)[`resume(proxy)`](#observableslimpauseproxy--resumeproxy)
  - [`ObservableSlim.pauseChanges(proxy)`](#observableslimpausechangesproxy--resumechangesproxy)[ / ](#observableslimpausechangesproxy--resumechangesproxy)[`resumeChanges(proxy)`](#observableslimpausechangesproxy--resumechangesproxy)
  - [`ObservableSlim.remove(proxy)`](#observableslimremoveproxy)
  - [`ObservableSlim.isProxy(obj)`](#observableslimisproxyobj)
  - [`ObservableSlim.getTarget(proxy)`](#observableslimgettargetproxy)
  - [`ObservableSlim.getParent(proxy, depth=1)`](#observableslimgetparentproxy-depth1)
  - [`ObservableSlim.getPath(proxy-options)`](#observableslimgetpathproxy-options)
  - [Advanced: ](#advanced-observableslimsymbols)[`ObservableSlim.symbols`](#advanced-observableslimsymbols)
- [Change Record Shape](#change-record-shape)
- [Usage Examples](#usage-examples)
  - [Observe and mutate deep structures](#observe-and-mutate-deep-structures)
  - [Array mutations (push/splice/shift/unshift)](#array-mutations-pushspliceshiftunshift)
  - [Batched notifications with ](#batched-notifications-with-domdelay)[`domDelay`](#batched-notifications-with-domdelay)
  - [Dry‑run approvals with ](#dry-run-approvals-with-pausechanges)[`pauseChanges`](#dry-run-approvals-with-pausechanges)
  - [Paths and parents](#paths-and-parents)
- [Design & Performance Notes](#design--performance-notes)
- [Limitations & Browser Support](#limitations--browser-support)
- [TypeScript](#typescript)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
- [Migration from legacy magic properties](#migration-from-legacy-magic-properties)

---

## Overview

**Observable Slim** mirrors your data in a Proxy and reports *precise* change records—ideal for state management, UI data binding, and tooling. It is small (\~5KB minified), fast, and designed to be predictable and memory‑safe.

Version: **0.2.0**\
License: **MIT**

## Features

- **Deep observation** of objects and arrays (all nested children)
- **Structured change records** with: `type`, `property`, `currentPath` (dot notation), `jsonPointer` (RFC6901), `previousValue`, `newValue`, `target`, `proxy`
- **Batched notifications** with `domDelay` (boolean or ms number)
- **Multiple proxies per target** with safe cross‑proxy propagation
- **Pause/resume** observers and **pause/resume changes** (dry‑run validation)
- **Accurate array length tracking** using WeakMap bookkeeping
- **Introspection helpers**: `isProxy`, `getTarget`, `getParent`, `getPath`
- **Advanced symbol capabilities** for collision‑free internals
- **TypeScript declarations** included (`observable-slim.d.ts`)

## Installation

**Browser (UMD):**

```html
<script src="https://unpkg.com/observable-slim"></script>
<script>
  const state = { hello: "world" };
  const proxy = ObservableSlim.create(state, false, (changes) => console.log(changes));
</script>
```

**NPM (CommonJS):**

```bash
npm install observable-slim --save
```

```js
const ObservableSlim = require('observable-slim');
```

**ES Modules (via bundlers that can import CJS):**

```js
import ObservableSlim from 'observable-slim';
```

## Quick Start

```js
const state = { user: { name: 'Ada' }, todos: [] };
const p = ObservableSlim.create(state, true, (changes) => {
  // Array of change records batched on a small timeout when domDelay === true
  console.log(changes);
});

p.todos.push({ title: 'Write tests', done: false });
p.user.name = 'Ada Lovelace';
```

## API

### `ObservableSlim.create(target, domDelay, observer?)`

Create a new Proxy that mirrors `target` and observes all deep changes.

- `target`: *object* (required) – plain object/array to observe.
- `domDelay`: *boolean|number* (required) – `true` to batch notifications on \~10ms timeout; `false` to notify synchronously; number `> 0` to use a custom delay (ms).
- `observer(changes)`: *function* (optional) – receives an *array* of change records.
- **Returns**: the Proxy.

> Note: Passing an existing Proxy produced by Observable Slim is supported; the underlying original target will be used to avoid nested proxying.

### `ObservableSlim.observe(proxy, observer)`

Attach an additional observer to an existing proxy. Observers are called with arrays of change records.

### `ObservableSlim.pause(proxy)` / `resume(proxy)`

Temporarily disable/enable *observer callbacks* for the given proxy (no changes are blocked).

### `ObservableSlim.pauseChanges(proxy)` / `resumeChanges(proxy)`

Disable/enable *writes to the underlying target* while still issuing change records. Useful for approval flows or validations.

### `ObservableSlim.remove(proxy)`

Detach all observers and bookkeeping for the given proxy and its nested proxies created for the same root observable.

### `ObservableSlim.isProxy(obj)`

Return `true` if the argument is a Proxy created by Observable Slim.

### `ObservableSlim.getTarget(proxy)`

Return the original target object behind a Proxy created by Observable Slim.

### `ObservableSlim.getParent(proxy, depth=1)`

Return the parent object of a proxy relative to the top‑level observable (climb `depth` levels; default `1`).

### `ObservableSlim.getPath(proxy, options)`

Return the path string of a proxy relative to its root observable.

- `options = { jsonPointer?: boolean }` – when `true`, return RFC6901 pointer (e.g., `/foo/0/bar`); otherwise dot path (e.g., `foo.0.bar`).

### Advanced: `ObservableSlim.symbols`

For advanced users who need capability‑style access without relying on public helpers, the library exposes collision‑free Symbols:

- `ObservableSlim.symbols.IS_PROXY` – brand symbol; `proxy[IS_PROXY] === true`
- `ObservableSlim.symbols.TARGET` – unwrap symbol; `proxy[TARGET] === originalObject`
- `ObservableSlim.symbols.PARENT` – function symbol; `proxy[PARENT](depth)` returns the ancestor
- `ObservableSlim.symbols.PATH` – path symbol; `proxy[PATH]` returns the dot path

> Symbols are not enumerable and won’t collide with user properties. Prefer the public helpers for most use cases.

## Change Record Shape

Every notification contains an array of objects like:

```ts
{
  type: 'add' | 'update' | 'delete',
  property: string,
  currentPath: string,   // e.g. "foo.0.bar"
  jsonPointer: string,   // e.g. "/foo/0/bar"
  target: object,        // the concrete target that changed
  proxy: object,         // proxy for the target
  newValue: any,
  previousValue?: any
}
```

## Usage Examples

### Observer output:

Below, every mutation is followed by the array that your observer handler function receives:

```js
const test = {};
const p = ObservableSlim.create(test, false, (changes) => {
  console.log(JSON.stringify(changes));
});

p.hello = "world";
// => [{
//   "type":"add","target":{"hello":"world"},"property":"hello",
//   "newValue":"world","currentPath":"hello","jsonPointer":"/hello",
//   "proxy":{"hello":"world"}
// }]

p.hello = "WORLD";
// => [{
//   "type":"update","target":{"hello":"WORLD"},"property":"hello",
//   "newValue":"WORLD","previousValue":"world",
//   "currentPath":"hello","jsonPointer":"/hello",
//   "proxy":{"hello":"WORLD"}
// }]

p.testing = {};
// => [{
//   "type":"add","target":{"hello":"WORLD","testing":{}},
//   "property":"testing","newValue":{},
//   "currentPath":"testing","jsonPointer":"/testing",
//   "proxy":{"hello":"WORLD","testing":{}}
// }]

p.testing.blah = 42;
// => [{
//   "type":"add","target":{"blah":42},"property":"blah","newValue":42,
//   "currentPath":"testing.blah","jsonPointer":"/testing/blah",
//   "proxy":{"blah":42}
// }]

p.arr = [];
// => [{
//   "type":"add","target":{"hello":"WORLD","testing":{"blah":42},"arr":[]},
//   "property":"arr","newValue":[],
//   "currentPath":"arr","jsonPointer":"/arr",
//   "proxy":{"hello":"WORLD","testing":{"blah":42},"arr":[]}
// }]

p.arr.push("hello world");
// => [{
//   "type":"add","target":["hello world"],"property":"0",
//   "newValue":"hello world","currentPath":"arr.0","jsonPointer":"/arr/0",
//   "proxy":["hello world"]
// }]

delete p.hello;
// => [{
//   "type":"delete","target":{"testing":{"blah":42},"arr":["hello world"]},
//   "property":"hello","newValue":null,"previousValue":"WORLD",
//   "currentPath":"hello","jsonPointer":"/hello",
//   "proxy":{"testing":{"blah":42},"arr":["hello world"]}
// }]

p.arr.splice(0,1);
// => [{
//   "type":"delete","target":[],"property":"0","newValue":null,
//   "previousValue":"hello world","currentPath":"arr.0","jsonPointer":"/arr/0",
//   "proxy":[]
// },{
//   "type":"update","target":[],"property":"length","newValue":0,
//   "previousValue":1,"currentPath":"arr.length","jsonPointer":"/arr/length",
//   "proxy":[]
// }]
```

### Arrays in detail (push/unshift/pop/shift/splice)

```js
const p = ObservableSlim.create({ arr: ["foo","bar"] }, false, (c) => console.log(JSON.stringify(c)));

p.arr.unshift("hello");
// 1) add index 2 moved -> implementation may record reindexes; canonical signal is:
// [{"type":"add","target":["hello","foo","bar"],"property":"0","newValue":"hello",
//   "currentPath":"arr.0","jsonPointer":"/arr/0","proxy":["hello","foo","bar"]}]

p.arr.pop();
// Deleting last element and updating length; commonly two records over one or two callbacks:
// [{"type":"delete","target":["hello","foo"],"property":"2","newValue":null,
//   "previousValue":"bar","currentPath":"arr.2","jsonPointer":"/arr/2","proxy":["hello","foo"]}]
// [{"type":"update","target":["hello","foo"],"property":"length","newValue":2,
//   "previousValue":3,"currentPath":"arr.length","jsonPointer":"/arr/length","proxy":["hello","foo"]}]

p.arr.splice(1,0,"X");
// Insert at index 1 and reindex subsequent items:
// [{"type":"add","target":["hello","X","foo"],"property":"1","newValue":"X",
//   "currentPath":"arr.1","jsonPointer":"/arr/1","proxy":["hello","X","foo"]}]

p.arr.shift();
// Move index 1 down to 0, delete old 1, update length. Typical sequence:
// [{"type":"update","target":["X","foo"],"property":"0","newValue":"X",
//   "previousValue":"hello","currentPath":"arr.0","jsonPointer":"/arr/0","proxy":["X","foo"]}]
// [{"type":"delete","target":["X","foo"],"property":"1","newValue":null,
//   "previousValue":"foo","currentPath":"arr.1","jsonPointer":"/arr/1","proxy":["X","foo"]}]
// [{"type":"update","target":["X","foo"],"property":"length","newValue":2,
//   "previousValue":3,"currentPath":"arr.length","jsonPointer":"/arr/length","proxy":["X","foo"]}]
```

> Notes: Exact batching of array index/length signals can vary by engine and call path. The shapes above are representative and covered by the test suite (push, unshift, pop, shift, splice, and length tracking).

### Multiple observers and multiple observables

```js
const data = { foo: { bar: "bar" } };
const p1 = ObservableSlim.create(data, false, (c) => console.log("p1", c));
ObservableSlim.observe(p1, (c) => console.log("p1-second", c));

const p2 = ObservableSlim.create(data, false, (c) => console.log("p2", c));

p2.foo.bar = "baz"; // triggers both observers on p1 and p2
```

### Pausing observers vs. pausing changes

```js
const p = ObservableSlim.create({ x: 0 }, false, (c) => console.log("obs", c));

ObservableSlim.pause(p);
p.x = 1;     // no observer callbacks
ObservableSlim.resume(p);

ObservableSlim.pauseChanges(p);
p.x = 2;     // observer fires, but underlying target is NOT updated
console.log(p.x); // still 0
ObservableSlim.resumeChanges(p);
p.x = 3;     // observer fires and target is updated
```

### Introspection helpers and Symbols

```js
const state = { a: { b: 1 } };
const proxy = ObservableSlim.create(state, false, () => {});

console.log(ObservableSlim.isProxy(proxy));     // true
console.log(ObservableSlim.getTarget(proxy) === state); // true

const child = proxy.a;
console.log(ObservableSlim.getParent(child) === proxy);   // parent proxy
console.log(ObservableSlim.getPath(child));               // 'a'
console.log(ObservableSlim.getPath(child, { jsonPointer:true })); // '/a'

const { TARGET, IS_PROXY, PARENT, PATH } = ObservableSlim.symbols;
console.log(proxy[IS_PROXY]);      // true
console.log(proxy[TARGET] === state); // true
console.log(child[PARENT](1) === proxy); // true
console.log(child[PATH]);          // 'a'
```

### Remove an observable

```js
const p = ObservableSlim.create({ y: 1 }, false, () => console.log('called'));
ObservableSlim.remove(p);
p.y = 2; // no callbacks after removal
```

## Design and Performance Notes

- **WeakMaps and Symbols.** Internals use `WeakMap` for O(1) lookups and GC‑friendly bookkeeping, and Symbols for collision‑free introspection.
- **Multiple proxies per target.** Changes propagate to sibling proxies without infinite loops (see tests around `dupProxy`).
- **Accurate array lengths.** Length changes are tracked to preserve correct `previousValue` semantics during `push/splice`.
- **Orphan cleanup.** When an object is overwritten and truly orphaned, its observers are cleaned up on a short timeout to prevent leaks while avoiding churn during transient operations.
- **Throughput.** The test suite includes coarse performance assertions (e.g., reading/writing \~20k items within tight budgets). Actual throughput depends on environment and workload.

## Limitations and Browser Support

This library requires native ES2015 **Proxy**, **WeakMap** and **Symbol** support.

- ✅ Chrome 49+, Edge 12+, Firefox 18+, Opera 36+, Safari 10+ (per MDN guidance)
- ❌ Internet Explorer: not supported

> Polyfills cannot fully emulate `Proxy`; features like property addition/deletion and `.length` interception will not work under a polyfill.

## TypeScript

Type declarations are published with the package (`observable-slim.d.ts`). Observer callbacks are strongly typed with the change record shape described above.

## Development

- **Install deps:** `npm ci`
- **Run tests:** `npm run test`
- **Lint:** `npm run lint` / `npm run lint:fix` to identify and correct code formatting.
- **Type declarations:** `npm run type` generates the `d.ts` file for TypeScript declarations.
- **Build (minified):** `npm run build` emits `.cjs`, `.mjs`, `.js` and `.d.ts` artifacts into the `dist` folder.

> The distributed repository already includes compiled artifacts for convenience. Building is only needed if you modify sources.

## Contributing

Issues and PRs are welcome! Please:

1. Write tests for behavioral changes.
2. Keep the API surface small and predictable.
3. Run `npm run lint` and `npm run test` before submitting.

## License

[MIT](./LICENSE)

---

## Migration from legacy magic properties

Earlier versions exposed *string‑named* magic fields (e.g., `__isProxy`, `__getTarget`, `__getParent()`, `__getPath`). These have been replaced by safer helpers and Symbols:

| Legacy (deprecated)         | New API                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `proxy.__isProxy`           | `ObservableSlim.isProxy(proxy)` or `proxy[ObservableSlim.symbols.IS_PROXY]`               |
| `proxy.__getTarget`         | `ObservableSlim.getTarget(proxy)` or `proxy[ObservableSlim.symbols.TARGET]`               |
| `proxy.__getParent(depth?)` | `ObservableSlim.getParent(proxy, depth)` or `proxy[ObservableSlim.symbols.PARENT](depth)` |
| `proxy.__getPath`           | `ObservableSlim.getPath(proxy)` or `proxy[ObservableSlim.symbols.PATH]`                   |

The helpers are preferred for readability and to avoid re‑entering traps unnecessarily.