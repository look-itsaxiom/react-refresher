This is a miniature `lit-html`. `html` tags a template literal into `{ strings, values }` (already
correct, below — note `strings` is the *same array object* on every call from this template
literal, which is what makes the fast path below possible). `buildFragment`, `resolveParts`,
`bindInitial`, and `renderList` parse the static markup once, mark every dynamic position with a
comment (`<!--@N-->`, for values sitting in text) or a temporary `data-bind-N` marker (for values
sitting in an attribute position like `attr="${v}"`, `.prop="${v}"`, or `@event="${v}"`), and are
also already correct.

Two things are broken:

**`applyBinding`** is supposed to look at whether a marked position came from `attr=`, `.prop=`,
or `@event=` and do the right thing for each. Right now it ignores that distinction completely and
always calls `setAttribute` — so `.disabled="${false}"` renders a literal, always-truthy
`disabled=""` attribute, and `@click="${handler}"` never calls `addEventListener` at all; the
handler function just gets stringified into a dead attribute.

**`render`** is supposed to check whether the container already has an `Instance` from a previous
call *with the same `strings` array* — if so, walk the existing `parts` and update only the ones
whose value actually changed (a text node's `.data`, an attribute, a property, or swapping an
event listener), leaving everything else — including array-position ("list") parts — untouched
when the array itself didn't change. Right now it skips that check and does a full rebuild
(`container.innerHTML = ''`, then reparse everything from scratch) on every single call, which
destroys node identity, tears down and reattaches every listener, and throws away the point of a
part-based renderer.

Fix both. Do not change `html`, `buildFragment`, `resolveParts`, `bindInitial`, or `renderList`.

A documented simplification you don't need to fix: when a list's array value changes, this mini
renderer regenerates every item in that list from scratch rather than diffing them individually —
real `lit-html` calls this the `repeat` directive's job, not the default behavior.
