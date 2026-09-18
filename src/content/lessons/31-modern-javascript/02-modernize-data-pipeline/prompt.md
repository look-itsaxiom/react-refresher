This module looks like it was written in 2019 — because it was, and it still works fine.
Your job is to bring each function's *implementation* up to date using the ES2023–2024
features from the previous step, without changing what any function returns.

Four functions, four upgrades:

1. **`groupByCategory(items)`** currently builds a plain object with a manual loop and an
   `Object.prototype.hasOwnProperty.call` guard. Replace the loop with `Object.groupBy`.

2. **`topN(items, n)`** currently does `items.sort(...).slice(0, n)` — `.sort()` mutates
   and returns the same array it's called on, so this silently reorders whatever array the
   caller passed in. Replace `.sort()` with the non-mutating `toSorted()`, then take the
   first `n` results with a plain `.slice(0, n)`.

3. **`uniqueTags(tagsA, tagsB)`** currently dedupes two concatenated arrays with an
   `indexOf` check inside a loop. Replace it with `Set` methods: build a `Set` from each
   input and combine them with `.union()`, then return a sorted array.

4. **`makeDeferred()`** currently captures `resolve`/`reject` from inside a `new Promise`
   constructor into variables declared outside it. Replace the whole thing with
   `Promise.withResolvers()`.

**Constraints that the checks enforce:**
- None of the four functions may mutate their input arrays. The checks pass frozen arrays;
  calling a mutating method (`.sort()`, `.push()`, `.reverse()`, ...) directly on a frozen
  array throws, and a check will catch that.
- Keep every function's exported name and parameter order the same — `App` already calls
  them.
- `groupByCategory`'s return value only needs to support reading its own keys the way a
  plain object does (`Object.keys`, bracket access) — `Object.groupBy` returns a
  null-prototype object, which is fine and expected.
