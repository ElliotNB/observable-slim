// types/usage.test.ts
import ObservableSlim, {
  create,
  observe,
  pause,
  resume,
  pauseChanges,
  resumeChanges,
  remove,
  isProxy,
  getTarget,
  getPath,
  getParent,
  symbols,
} from 'observable-slim';

// ---- Setup, shape inference -------------------------------------------------

const state = {
  user: { name: 'Ada' },
  todos: [] as Array<{ title: string; done: boolean }>,
};

// create() infers T from `state`; `p` should be the same structural type as `state`.
const p = ObservableSlim.create(state, false, (changes) => {
  // Strongly assert the change record shape (compile-time only).
  const _ok = changes satisfies Array<{
    type: 'add' | 'update' | 'delete';
    property: string | symbol;
    currentPath: string;
    jsonPointer: string;
    target: object;
    proxy: object;
    newValue: unknown;
    previousValue?: unknown;
  }>;
  void _ok;
});

// A couple of valid mutations should type-check
p.user.name = 'Ada Lovelace';
p.todos.push({ title: 'Write tests', done: false });

// ---- Helpers ----------------------------------------------------------------

const child = p.user;

getParent(child);
getPath(child);
isProxy(p);
getTarget(p);

// Option argument for getPath
getPath(child, { jsonPointer: true });
getPath(child, {}); // optional param accepted

// Control APIs accept the proxy
pause(p);
resume(p);
pauseChanges(p);
resumeChanges(p);
remove(p);

// ---- Alternate import form sanity (named `create`) --------------------------

const p2 = create({ x: 1 }, 25, (cs) => {
  // callback param is typed, so this must be an array of change records:
  for (const c of cs) {
    const _t: 'add' | 'update' | 'delete' = c.type;
    void _t;
  }
});
p2.x = 2;

// observe() callback types
observe(p2, (cs) => {
  cs.map((c) => c.currentPath);
});

// ---- Negative tests (should fail if types loosen) ---------------------------

// wrong field type
// @ts-expect-error name must be string
p.user.name = 123;

// wrong element shape in todos
// @ts-expect-error `done` must be boolean
p.todos.push({ title: 'x', done: 'nope' });

// extra property on user should not exist
// @ts-expect-error `age` does not exist on user
p.user.age = 42;

// getPath option type must be boolean if present
// @ts-expect-error jsonPointer expects boolean
getPath(child, { jsonPointer: 'yes' });

// create() observer param type must be the change-record array
// @ts-expect-error wrong callback arg type
create(state, false, (n: number) => {});

// helpers must receive proxies, not numbers
// @ts-expect-error `getParent` expects a proxy created by ObservableSlim
getParent(123);

// ---- Symbols (light sanity without widening the proxy type) -----------------

// We don’t index p by symbol (that would require widening the return type).
// Instead, assert symbol types exist.
const { IS_PROXY, TARGET, PATH, PARENT } = symbols;
const _s1: symbol = IS_PROXY;
const _s2: symbol = TARGET;
const _s3: symbol = PATH;
const _s4: symbol = PARENT;
void _s1; void _s2; void _s3; void _s4;

// ---- Assignability sanity ---------------------------------------------------

// `p` and `state` should be mutually assignable (structurally identical at type level)
const _assign1: typeof state = p;
const _assign2: typeof p = state;
void _assign1; void _assign2;
