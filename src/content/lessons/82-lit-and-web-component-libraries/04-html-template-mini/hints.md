`binding.kind` is already `'attr' | 'prop' | 'event'` by the time it reaches `applyBinding` —
`buildFragment` figured that out from the `@`/`.` prefix. Branch on it: `'event'` calls
`el.addEventListener(binding.name, value)`; `'prop'` does `(el as any)[binding.name] = value`;
`'attr'` is close to what's there now, just add the `false`/`null`/`undefined` →
`removeAttribute` convenience real Lit gives boolean-ish attributes.
---
In `render`, look up `instances.get(container)` first. If it exists and its `strings` is the exact
same array as the new template's `strings` (`===`, not deep equality — that's the whole trick),
take a different path than the unconditional rebuild: loop over `template.values` by index,
compare each one to `previous.values[i]` with `Object.is`, and only touch the DOM for the ones
that changed. Everything you need to update a given index is already sitting in
`previous.parts[i]`.
---
Each `Part` variant tells you exactly what to do when its value changed: `text` → set
`.node.data`; `attr`/`prop` → same logic as `applyBinding`, just reusing `part.el`/`part.name`
instead of creating a new binding; `event` → `removeEventListener` the *old* handler
(`part.handler`) before adding the new one, then remember the new one on `part.handler`.
---
For a `list` part, don't try to diff the array's items — the exercise doesn't require it. Just
compare the array itself with `Object.is` against the old value; if it's a new array, remove every
node in `part.nodes`, call the given `renderList` on the new array, splice the new nodes in after
`part.marker` (same insertion pattern `bindInitial` already uses), and store them as the part's
new `nodes`. Don't forget to update `previous.values = template.values` at the end of the fast
path, or the next render will keep diffing against stale values.
