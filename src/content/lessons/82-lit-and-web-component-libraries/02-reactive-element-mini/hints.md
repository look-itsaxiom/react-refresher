Give the element a real `updateComplete` promise, created in the constructor, with its `resolve`
saved on the instance. Don't resolve it immediately — resolve it from inside the batched render,
then immediately replace it with a fresh pending promise for the *next* batch.
---
Batching is a boolean flag plus `queueMicrotask`. In the setter (or a `requestUpdate` helper it
calls): if a batch is already pending, just record the change and return; otherwise set the flag,
schedule a microtask that does the actual render + `updated()` + resolves `updateComplete`, and
clears the flag. Skip the whole setter body with an early `return` when `Object.is(old, value)`.
---
Track changes in a `Map<string, unknown>` on the instance (property name → old value), populated
by every setter call, and hand that exact map to `render`'s microtask, then start a fresh empty
one for whatever comes after.
---
For `reflect`, call `setAttribute`/`removeAttribute` from inside the setter when `opts.reflect` is
true. To stop that `setAttribute` call from re-triggering `attributeChangedCallback` in a loop:
set a boolean flag (e.g. `this.reflecting = true`) right before calling `setAttribute`, clear it
right after, and have `attributeChangedCallback` return immediately when that flag is set.
