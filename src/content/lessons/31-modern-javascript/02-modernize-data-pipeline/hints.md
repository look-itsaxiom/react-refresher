`Object.groupBy` takes the array and a key function, and returns the grouped object
directly — `Object.groupBy(items, (item) => item.category)` is the entire function body.
No accumulator, no loop.
---
`toSorted` takes the exact same comparator you'd give `.sort()`, but returns a new,
sorted array and leaves the original untouched. `items.toSorted((a, b) => b.score -
a.score)` gives you a descending copy; `.slice(0, n)` on that copy gets you the top `n`
without ever writing to `items` itself.
---
For `uniqueTags`, build one `Set` per input array (`new Set(tagsA)`), then call `.union()`
on it with the other `Set` as the argument. `.union()` returns a new `Set` — spread it into
an array (`[...merged]`) and `.sort()` that array before returning.
---
`Promise.withResolvers()` returns an object shaped exactly like `Deferred<T>` already —
`{ promise, resolve, reject }`. `makeDeferred` can be a one-line wrapper:
`return Promise.withResolvers<T>();`. You don't need the `new Promise` constructor at all
anymore.
