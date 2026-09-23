# What landed in the language, ES2021 to ES2025

If your JavaScript habits solidified around ES2020, you've missed five specification years.
None of this is exotic — it's mostly small, load-bearing stuff that quietly replaces patterns
you're still typing by hand. Node 22 and current Chrome ship all of it.

## The small syntax wins

**Logical assignment** (ES2021) collapses the "set this if it's missing" idiom:

```ts
config.timeout ??= 3000; // was: config.timeout = config.timeout ?? 3000;
user.name ||= 'Anonymous';
flags.debug &&= isDevelopment;
```

**Numeric separators** (ES2021) make large literals readable: `1_000_000` instead of
`1000000`. Purely cosmetic, zero runtime cost, and every linter understands it now.

**`Array.prototype.at`** (ES2022) gives you negative indexing without `.slice(-1)[0]`:
`items.at(-1)` is the last item, full stop. It works on strings and typed arrays too.

**`Object.hasOwn`** (ES2022) replaces `Object.prototype.hasOwnProperty.call(obj, key)`. It's
the same check, but it works even when `obj` doesn't inherit from `Object.prototype` (a
`null`-prototype object, or one where `hasOwnProperty` was shadowed as a data property), and
it reads like a normal function call instead of a defensive incantation.

**Class fields, private methods, and static blocks** (ES2022) finished the class syntax that
was still landing piecemeal in 2020: `class Counter { #count = 0; #tick() { this.#count++; }
static #instances = new WeakSet(); static { /* runs once, at class definition */ } }`.
Private fields are enforced by the engine, not a naming convention — `#count` is a syntax
error outside the class body, not just discouraged.

**Top-level `await`** (ES2022) works in ES modules without wrapping in an async IIFE. React
Refresher's modules lesson covers the module-loading implications; the syntax itself is just
`await` at the top of a `.mjs`/`type: module` file.

**`Array.prototype.findLast` / `findLastIndex`** (ES2023) search from the end without
reversing first. `orders.findLast(o => o.status === 'shipped')` beats
`orders.slice().reverse().find(...)` — and doesn't allocate a reversed copy.

**Hashbang syntax** (ES2023) formalizes `#!/usr/bin/env node` as the first line of a script
being valid JS (previously it worked only because Node stripped it before parsing).

## Change-array-by-copy: the one that matters for React

ES2023 added four non-mutating array methods that mirror the mutating ones you already know:
`toSorted`, `toReversed`, `toSpliced`, and `with`.

```ts
const original = [3, 1, 2];
const sorted = original.toSorted(); // [1, 2, 3] — original is untouched
const swapped = original.with(0, 99); // [99, 1, 2]
```

Compare to the pre-2023 idiom for the same thing: `[...original].sort()`. That spread-then-
mutate pattern is easy to get wrong (forget the spread, and you mutate a prop or a piece of
state in place) and it's why `toSorted`/`with` matter specifically for React: state updates
need a new reference, and "copy defensively, then use the mutating method" was always one
missing `[...]` away from a bug that only shows up as a stale render. `setItems(items.with(i,
updated))` cannot accidentally mutate the array `items` still points to elsewhere.

## Grouping, waiting, and set math

**`Object.groupBy` / `Map.groupBy`** (ES2024) replace the `reduce`-into-an-accumulator
pattern for the single most common "bucket things by a key" task:

```ts
const byStatus = Object.groupBy(orders, (o) => o.status);
// { pending: [...], shipped: [...] } — a null-prototype object, not a plain {}
```

`Map.groupBy` does the same thing but returns a `Map`, which matters when your group keys
aren't strings (grouping by a `Date` or an object reference, for instance).

**`Promise.withResolvers`** (ES2024) replaces the "declare `resolve`/`reject` outside the
constructor, assign them inside" deferred pattern:

```ts
const { promise, resolve, reject } = Promise.withResolvers<string>();
```

No more `let resolve!: (v: string) => void;` above a `new Promise` just to smuggle the
callback out of the constructor's closure.

**Set methods** (ES2025) — `union`, `intersection`, `difference`, `symmetricDifference`,
`isSubsetOf`, `isSupersetOf`, `isDisjointFrom` — turn "dedupe and combine these lists" from a
manual loop with an `indexOf` check into one expression: `new Set(a).union(new Set(b))`. All
of them return a new `Set` and leave the originals alone.

**The RegExp `v` flag** (ES2024) enables set operations inside character classes
(`/[\p{Letter}--[a-z]]/v` — "letters, minus lowercase ASCII") and allows duplicate named
capture groups across alternation branches, which the older `u` flag rejected.

## Iterators, async collection, and I/O niceties

**Iterator helpers** (ES2025) add `map`, `filter`, `take`, `drop`, `flatMap`, `reduce`, and
`toArray` directly to iterators — including generator objects, which inherit them for free.
This is the biggest one for how you structure data pipelines, and the next exercise leans on
it: you can chain lazy transformations over a sequence (even an infinite one) and only pay
for the items you actually consume.

```ts
function* naturals() { let n = 1; while (true) yield n++; }
const firstFiveSquares = naturals()
  .map((n) => n * n)
  .take(5)
  .toArray(); // [1, 4, 9, 16, 25] — naturals() never runs past 5
```

**`Array.fromAsync`** (ES2024) drains an async iterable (or an iterable of promises) into an
array: `await Array.fromAsync(paginatedFetch())`. It's `Array.from` for the async case,
without a manual `for await` loop and a `push`.

**Import attributes and JSON modules** (ES2025 for import attributes; JSON modules build on
them) let you write `import data from './config.json' with { type: 'json' }` so the loader
knows the MIME type up front instead of guessing from the extension — this matters most for
non-file loaders (HTTP imports, bundler virtual modules).

**`Float16Array`** (ES2025) adds a half-precision typed array, useful mainly for
interoperating with GPU/ML pipelines (WebGPU buffers, ONNX-style tensors) that use 16-bit
floats — not something you'll reach for in typical app code.

None of these features change what's *possible* — everything above has always been
expressible with a loop, a `reduce`, or a hand-rolled deferred. What changed is that the
common case now has a name, ships everywhere current, and reads at a glance.

## Further reading (optional)
- [TC39 finished proposals](https://github.com/tc39/proposals/blob/main/finished-proposals.md) — every feature above, with its stage history
- [MDN: Change Array by copy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections#copying_methods_and_mutating_methods) — the non-mutating array methods in context
- [web.dev: Iterator helpers are Baseline](https://web.dev/blog/baseline-iterator-helpers) — browser/engine support timeline
- [MDN: Set methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) — union/intersection/difference and friends
