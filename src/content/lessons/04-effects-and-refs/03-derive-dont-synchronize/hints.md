`total` never needs its own `useState`. Anything you can compute from `items` during render doesn't belong in state at all — delete the `useState`/`useEffect` pair and replace them with a plain expression.
---
For `NoteEditor`, the fix isn't a better effect — it's no effect. Look at how the parent renders `<NoteEditor customerId={customerId} />` and think about what tells React whether to reuse the existing component instance or mount a brand new one.
---
Give the parent's `<NoteEditor ... />` a `key={customerId}`. Changing an element's key unmounts the old instance (with its stale `note`) and mounts a fresh one with a fresh `useState('')`. You can then delete the reset effect entirely.
