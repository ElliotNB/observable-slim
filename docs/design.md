# Observable Slim - Design and Implementation

**Goal.** Provide a deep, precise, and memory-safe change stream for plain JavaScript objects/arrays using ES2015 `Proxy`, suitable for state management and UI data-binding. This document models the problem, details the core algorithms (instrumentation, teardown, scheduling), states invariants and complexities, and sketches correctness arguments and trade-offs. *In short: you mutate normal JS objects/arrays, and we emit structured “what changed” events you can consume.*

---

## 1. Problem Model

**Rooted object graph.** The user supplies a *root* object/array `R`. Treat the application state as a directed graph with:

- **Nodes** = object or array references.  
- **Edges** = own, enumerable, string-keyed properties. *(Think: each property is a pointer from a parent node to a child node.)*

**Instrumentation via `Proxy`.** For each node, we create (or reuse) an ES `Proxy` to intercept `get` / `set` / `deleteProperty`. Each mutation emits a structured change record:

    {
      type: 'add' | 'update' | 'delete',
      property, currentPath, jsonPointer,
      previousValue?, newValue, target, proxy
    }

*(At a glance: `type` tells you what happened; `property` which key; `currentPath` and `jsonPointer` tell you where; `previousValue`/`newValue` tell you the delta; `target` is the concrete object that changed; `proxy` is the proxy you interacted with.)*

**Multi-observable fan-out.** Multiple *observables* (root proxies) can track the same *target* node. A mutation via any proxy must:
1. update the underlying target (unless writes are paused),
2. propagate to sibling proxies for the same target exactly once,
3. notify all observers attached to each root observable. *(Informally: “one write, all watchers see it once.”)*

---

## 2. Core Algorithms

### A. Instrumentation: cycle-safe automatic deep proxying

**Key tables and slots**

- **Brand table.** `proxyToRecord: WeakMap<proxy -> { target, observable, parent, property }>`  
  O(1) brand checks and fast access to the parent proxy for path reconstruction.

- **Target table.** `targetToProxies: WeakMap<target -> Array<{ target, proxy, observable }>>`  
  O(1) average lookup to find sibling proxies for fan-out.

- **Array lengths.** `arrayLength: WeakMap<Array, number>`  
  Correct `previousValue` for `length` under push/splice (ES engines may mutate `length` before traps run).

- **Internal Symbols.** Collision-free capabilities:
  - brand: `IS_PROXY`
  - unwrap: `TARGET`
  - parent accessor: `PARENT`
  - path accessor: `PATH`  
  *(Symbols are unique keys that won’t collide with user properties or show up in normal enumeration.)*

- **No proxy-of-proxy.** If a value is already our proxy, unwrap to its original target before storing or recursing. *(Prevents “proxy nesting” and keeps paths correct.)*

**Creation (`create` -> `_create`)**

1. **Root proxy** created with traps; `observe()` attaches callbacks.  
2. **Deep walk**: iterative DFS algorithm (stack + `WeakSet`) touches reachable children once.
3. **`get` trap**:
   - Returns bound methods for `Date` targets.
   - On object/array properties: unwrap if proxied; then **reuse** an existing proxy *for this observable* or create a new one.
   - **Lineage linking**: New proxies are initialized with a reference to their `parent` proxy and the `property` name, forming a reverse linked list.

4. **Paths** are computed **lazily** by traversing the `parent` chain up to the root. `getPath()` walks this chain, recomputing array indices on the fly (via `indexOf`) so strings always reflect post-mutation positions.

**Notification batching (`domDelay`)**

- **Synchronous** when `false`.  
- **Batched** via `setTimeout` when `true` or a positive number: coalesces multiple writes into one callback with a snapshot of `changes[]`. *(Use `true` when your observer updates the DOM to avoid redundant reflows; a number lets you choose the delay in ms.)*

---

### B. Cross-proxy fan-out with cycle breaking

When a `set` / `deleteProperty` occurs on proxy `p` for target `T`:

1. Record the change (including `previousValue`).  
2. If this is the **originating** proxy (guarded by a `dupProxy === null` check):
   - Apply to `T` unless writes are paused.
   - Ensure newly assigned objects are tracked by touching `proxy[property]` (which triggers `get` to creation/reuse).
   - **Fan-out** to other proxies of `T`: set `dupProxy = siblingProxy` and perform the same operation on each sibling.
   - In each sibling, the trap sees `dupProxy === self`, marks as non-originating, and **does not** re-propagate (breaks loops). *(You can think of `dupProxy` as a “stamp” marking which sibling is being updated to prevent ping-pong.)*
3. Notify observer callbacks.

This yields exactly-once delivery per sibling proxy without infinite recursion.

---

### C. Teardown: reachability + orphan sweep

**Trigger.** When a property that held an object is overwritten with a non-identical value, schedule cleanup of the *old object subtree* for **this observable only**.

**Reachability (`graphContains`).** Iterative DFS algorithm from root `R` using a `WeakSet`. During traversal, unwrap any encountered proxies to their targets so identity checks are canonical. If `old` is still reachable, skip cleanup. *(“Reachable” means there is still some path of properties from `R` to that object; otherwise it’s an **orphan** for this observable.)*

**Orphan sweep (`cleanupOrphan`).** Iterative DFS algorithm (cycle-safe) starting at `old`:
- If `targetToProxies.has(node)`, delete **only** entries with `.observable === thisObservable`. If the array becomes empty, delete the WeakMap key for GC-friendliness.
- Traverse only own, enumerable, string-keyed children. Unwrap proxies before pushing.

This detaches bookkeeping for the current observable while preserving other observables' registrations.

---

### D. Scheduler: coalesced cleanup with idle/timeout fallback

**Goal.** Avoid heavy clean-up work during mutation interception and de-duplicate repeated cleanups for the same object.

**Mechanism.**
- `pendingCleanups: Map<oldObj -> Set<observable>>`
- `scheduleCleanup(obs, old)` inserts `(obs, old)` and returns immediately.
- Single timer:
  - Prefer `requestIdleCallback(cb, { timeout: CLEANUP_DELAY_MS })`
  - Fallback to `setTimeout(cb, CLEANUP_DELAY_MS)`
- `flushCleanup()` drains the map: for each `(old, setOfObs)` run `sweepOrphan(obs, old)` for all `obs` in the set.

**Configurability and testability.**
- `ObservableSlim.configure({ cleanupDelayMs })` to tune latency/throughput.  
- `ObservableSlim.flushCleanup()` cancels any pending idle/timeout and runs immediately -- useful for deterministic testing. *(`requestIdleCallback` means “run this when the browser has a moment,” with a hard timeout as a backstop.)*

---

## 3. Invariants

1) **No proxy-of-proxy.**  
   - Unwrap on `create` and on `set` to avoid mixing targets and proxies.

2) **O(1) brand/lookups.**  
   - `proxyToRecord` / `targetToProxies` are `WeakMap`s keyed by identity.

3) **No leaks after overwrite.**  
   - Orphan cleanup detaches only this observable’s proxy records; others remain.

4) **Correct array deltas.**  
   - Paths recompute indices after shifts/splices; `arrayLength` yields correct `(previousValue, newValue)` for `length`.

5) **Exactly-once cross-proxy propagation.**  
   - `dupProxy` marks induced operations and prevents re-fan-out. *(No infinite loops; no missed siblings.)*

6) **Observer control is explicit and safe.**  
   - `pause`/`resume` affect callbacks; `pauseChanges`/`resumeChanges` affect writes. APIs throw when called on removed/non-matching proxies.

7) **Stable paths and parents.**  
   - Dotted and pointer forms; `getParent(proxy, depth)` returns ancestors relative to the root observable.

### API-level contracts

- **I1. Single-delivery per target mutation.**  
  For any target `T`, every proxy in `targetToProxies.get(T)` observes each logical mutation at most once.

- **I2. Scoped teardown.**  
  After cleanup of orphan subtree `S` for observable `O`, no `targetToProxies[v]` entry remains with `.observable === O` for any `v ∈ S`.

- **I3. Path fidelity.**  
  `getPath(proxy, { jsonPointer? })` reflects current array indices of traversed nodes.

- **I4. Control semantics.**  
  `pause`/`resume` gate observer delivery only and `pauseChanges`/`resumeChanges` gate writes only.

---

## 4. Complexity

Let:
- `N` = reachable nodes (objects/arrays) from root at creation,
- `d` = depth (segments) of a mutated property,
- `n` = length of the array segment for the indexed path recomputation,
- `m` = number of proxies attached to the same target,
- `o` = number of observers for the root observable,
- `k` = size of an orphaned subtree.

### At-a-glance

| Operation            | Time                                   | Space                  | Notes |
|----------------------|----------------------------------------|------------------------|-------|
| **Create**           | **O(N)**                               | O(N) proxies           | Iterative DFS; **no path array copying** (linked list). |
| **Set/Delete**       | **O(d)** path + **O(n)** index recompute + **O(m)** fan-out + **O(o)** notify | O(1) | Path string generated lazily by walking up `d` parents. |
| **Cleanup enqueue**  | **O(1)** amortized                     | O(1)                   | Insert into `pendingCleanups` map/set. |
| **Cleanup flush**    | **O(k)** per orphaned component        | O(k) transient         | Iterative DFS with `WeakSet` (cycle-safe). |

### Details

- **Creation.** Iterative DFS triggers `get` to create/reuse nested proxies. Each new proxy stores a reference to its parent (linked list), ensuring **O(1)** allocation per node regardless of depth.
- **Set/Delete.** Record change, apply, ensure tracking, fan-out, and notify. Path strings are generated on-demand by walking the parent chain.
- **Cleanup.** `scheduleCleanup` coalesces work (idle/timeout). `graphContains(root, old)` prevents false positives; `cleanupOrphan` removes only this observable’s records. *(Rule of thumb: steady-state writes are O(1); work grows with path depth, number of sibling proxies, and number of observers.)*

---

## 5. Correctness Arguments (sketches)

**Cycle-safety -> termination.**  
All traversals (creation walk, reachability, cleanup) are iterative and use a `WeakSet` of visited nodes. Each object is processed at most once (even with cyclical references in the object graph).

**Reachability guard prevents false positives.**  
We sweep only if `graphContains(R, old)` is false. Because traversal unwraps proxies and compares by reference, shared subgraphs/aliases are respected. Thus, we never detach a node still reachable from the root observable. *(Intuition: if there’s still a path from `R` to `old`, it’s not an orphan and must stay attached.)*

**Exactly-once fan-out.**  
Let `P` be the proxies for target `T`. On an originating write via `p ∈ P`, we iterate `P \ {p}` and, for each `q`, set `dupProxy = q` and invoke the same operation. In `q`’s trap, `dupProxy === q` marks as non-originating and suppresses further propagation. Therefore, every `q` is induced exactly once; no cycles arise.

**Array `length` correctness.**  
Since engines update `length` before the `set` trap during array mutators, we read the old value from `arrayLength.get(target)` and update the cache afterward, yielding correct `(previousValue, newValue)` pairs.

---

## 6. Trade-offs and Limitations

- **Array index recomputation is O(n).**  
  Paths through arrays recompute indices via `indexOf` so strings track moves after `unshift`/`splice`. Simple and predictable, at the cost of linear time in the array segment.

- **Traversal scope is conservative.**  
  We traverse only own, enumerable, string-keyed properties. Symbol/non-enumerable keys are intentionally excluded to avoid surprising interception of framework/private state.

- **Proxy invariants.**  
  Targets should be plain, extensible objects/arrays. Deleting non-configurable properties or interacting with sealed/frozen objects is not a goal; engines enforce invariants. *(If you need to observe exotic objects, you’ll need additional guardrails to satisfy the ES Proxy rules.)*

- **Observable lifetime.**  
  Call `ObservableSlim.remove(proxy)` to detach an observable and release its proxy records; APIs like `pause/resume` and `getParent/getPath` throw on removed/non-matching proxies.

- **Lazy path generation.**  
  Paths are not stored as arrays but calculated by walking up the parent chain. This ensures **O(N)** creation time for deep graphs (avoiding O(N²) memory/copy costs), but means `getPath()` is an **O(depth)** operation rather than an O(1) property access.

---

## 7. Standards

- **ECMAScript: Proxy internal methods and invariants.**  
  Correctness of `get`, `set`, `deleteProperty` and invariant preservation.

- **RFC 6901: JSON Pointer.**  
  An RFC-compliant JSON Pointer is provided via `getPath(proxy, { jsonPointer: true })`

---

## 8. Evidence: Test Map (selected)

| Claim / behavior | Tests |
|---|---|
| Perf sanity (20k reads/writes) | 1–2 |
| Add/update/delete scalars | 3–5, 8–11, 21 |
| Deep nesting + JSON Pointer | 6 |
| Array ops (push/unshift/pop/splice/shift) | 13–19 |
| Path updates after index shift | 20, 45 |
| Multiple observables & propagation | 25–29, 44, 51–52 |
| Pause/resume observers vs. writes | 31–33 |
| Remove observable | 30 |
| Date method binding & JSON.stringify/valueOf | 35–39 |
| Symbol branding & helpers | 22–23, 40–47 |
| Edge keys / dotted names | 53–54 |
| Cycle-safety (create & cleanup) | 55–56 |
| Orphan cleanup correctness | 34, 50–52, 57 |

Run locally: `npm ci && npm run test`
