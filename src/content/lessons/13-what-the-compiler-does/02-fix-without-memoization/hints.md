`Array.prototype.sort` mutates and returns the same array. Anything that reads `players` again later — even a completely different part of the tree — sees the reordered version, because it's the same object in memory. Copying the array before sorting is a one-word fix.

---

For the ref: think about which piece of code is *supposed* to run exactly once per click. `clickCountRef.current += 1` currently sits where the render body runs, which is not the same as "once per click" — a render body can be called more than once for one real commit. Move the mutation into the function that's already wired to the click.

---

The fix is `const ranked = [...players].sort(...)` (spread into a new array, then sort that), and moving `clickCountRef.current += 1` into the `onClick` handler, right next to `setTick`. Nothing else about the component needs to change — the roster list and click-count paragraph can stay exactly as they are.
