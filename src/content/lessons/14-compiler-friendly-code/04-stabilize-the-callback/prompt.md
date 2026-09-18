`TodoRow` is wrapped in `React.memo` so it only re-renders when its own props change. It
isn't working: clicking "Unrelated update" below re-renders every row, even though no
row's data changed.

Each row has a `data-renders` attribute counting how many times it has rendered — that's
how the checks (and you, in the preview) can see the problem.

Find the prop that gets a new identity on every render of `TodoApp` and fix it so it stays
stable across unrelated re-renders. You'll need two changes, not one:

1. `toggle` itself needs a stable identity — wrap it so its reference doesn't change
   between renders. (You can avoid depending on `todos` entirely by using the updater form
   of `setTodos`.)
2. Stop wrapping it in a new inline arrow function where it's passed to `TodoRow` — an
   inline `(id) => toggle(id)` is a new function every render no matter how stable `toggle`
   is underneath it.

Don't change `TodoRow`'s behavior or remove `React.memo` — the fix is entirely in
`TodoApp`. If you were compiling this file with React Compiler, it would do this for you
automatically; here you're doing by hand what it would otherwise do.
