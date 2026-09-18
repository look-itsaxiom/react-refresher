Give the module a `Map` (declared outside the `cache` object, in module scope) to hold memoized values keyed by tag.

---

`cached(tag, loader)`: check the map for `tag` first. If it's there, return it. If not, call and `await loader()`, store the result in the map under `tag`, then return it.

---

`revalidateTag(tag)`: just `map.delete(tag)`. The next `cached()` call for that tag will find nothing there and call the loader again -- you don't need to eagerly reload it yourself.

---

Make sure `cached` stores the *resolved* value, not the pending promise, so two different callers awaiting it after the first load both see the same plain value rather than racing separate loads.
