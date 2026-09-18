# Code the Compiler can trust

React Compiler (stable since React 19.2, shipped as 1.0 in October 2025) memoizes your
components and hooks automatically: it rewrites render functions so that values which
didn't change between renders are reused instead of recomputed, and children whose props
are unchanged skip re-rendering. You stop hand-writing `useMemo`/`useCallback`/`React.memo`
for the common case. The trade is that the Compiler only optimizes code that follows the
Rules of React strictly enough for it to prove the optimization is safe. Code that breaks
those rules doesn't get an error at first — the Compiler just quietly **bails out** on that
component (or that specific hook), leaving it running exactly as-authored, unmemoized. You
already wrote code this way before the Compiler existed, for good reasons: this is about
tightening the habits that make the rules of purity, immutability, and hook order the
compiler can *verify*, not just style you were told to prefer.

## The core deal: render is a pure function of props and state

A component's render (and any hook body it calls) is a pure function: given the same
props, state, and context, it produces the same output, with no visible side effects along
the way. The Compiler's memoization is only sound because it can assume this. Concretely:

- **Local mutation is fine.** Creating an array or object during render and mutating it
  before returning it is normal and cheap — the Compiler tracks this and doesn't need to
  memoize something that never escapes.
- **Mutating something *after* it's been captured elsewhere is not.** Once a value is
  read by another hook, passed to a child, or stored, treat it as frozen. This is the line
  between "building a value" and "mutating a value in use."
- **Props and state are always read-only.** `props.items.push(x)` or `state.count++` are
  bugs regardless of the Compiler — they've always risked stale renders and inconsistent
  UI under concurrent rendering. The Compiler's `immutability` lint rule now catches many
  of these statically.
- **No side effects in render.** No `fetch`, no `localStorage.setItem`, no `console.log`
  that a test asserts on, no mutating a ref. Side effects belong in event handlers or
  `useEffect`. The compiler-powered `set-state-in-render` and `purity` lint rules flag
  calling `setState` or doing I/O directly in a component body.
- **Hooks are called unconditionally, in the same order, every render.** This was already
  a hard rule (hook state is matched to call *position*, not identity) — the Compiler
  additionally needs a stable hook sequence to build its dependency graph.
- **Refs are read and written only in effects and event handlers, never during render.**
  `ref.current` is mutable state that render cannot see change without React knowing, so
  reading it while rendering produces a value the Compiler (and React itself, under
  concurrent features) cannot guarantee is consistent. A common way this bites in practice:
  reading `containerRef.current.offsetWidth` straight in the component body crashes on the
  very first render, because the ref is still `null` — nothing has mounted the DOM node
  yet. Measure in an effect and store the result in state instead.

## Don't reach for in-place array/object methods

`Array.prototype.sort`, `.reverse`, and `.splice` mutate the array in place and return it —
which is exactly the shape of bug that slips past review, because the code *looks* pure
(`return items.sort(...)`) while quietly mutating the caller's array. If `items` came in as
a prop, you've now mutated the parent's state out from under it, potentially on every
render. Prefer the copying counterparts added in ES2023, all supported in every target
browser and in Node 20+:

```tsx
// Mutates `players` — a bug if it's a prop or came from state.
function sortedBug(players: Player[]) {
  return players.sort((a, b) => b.score - a.score);
}

// Leaves the original array alone.
function sortedFixed(players: Player[]) {
  return players.toSorted((a, b) => b.score - a.score);
}
```

`toReversed()` replaces `.reverse()`, and `arr.with(index, value)` replaces
`arr[index] = value` or `.splice(index, 1, value)` for producing an updated copy. The same
principle extends past arrays: a function passed to you as a prop is not yours to reassign
properties on, a `Map` or `Set` held in state should be replaced with a new instance on
update (`new Map(oldMap).set(k, v)`, not `oldMap.set(k, v)`), and a class instance in state
should be treated as immutable unless the class itself is designed for structural sharing.

## Randomness and other non-deterministic reads

`Math.random()`, `Date.now()`, and `crypto.randomUUID()` called directly in render produce
a different value every time that component function runs — including re-renders where
nothing the user cares about changed. If that value becomes a `key` or a `data-id`, every
re-render silently reshuffles React's reconciliation identity for that element, which can
remount DOM nodes, reset focus, and restart CSS transitions. If you need a stable id for
an item, derive it from data that doesn't change (a database id, a natural key) or generate
it once with `useState(() => crypto.randomUUID())` / `useId()` so it's computed on mount
and stays fixed for the component's lifetime — not recomputed on every render.

## How the bailout actually looks

The Compiler compiles component-by-component (and hook-by-hook). A violation in one
component does not disable memoization for the rest of the app — it just means *that*
component keeps its original, unmemoized code, and React logs nothing by default in
production. Development-time signal comes from `eslint-plugin-react-hooks` (v6+ merges the
Compiler's diagnostics into the existing hooks plugin): rules named `react-hooks/purity`,
`react-hooks/immutability`, `react-hooks/refs`, `react-hooks/set-state-in-render`,
`react-hooks/set-state-in-effect`, `react-hooks/static-components`, and
`react-hooks/use-memo` all point at exactly this class of problem, at the specific line
that broke the compiler's assumptions. Treat a red squiggle from one of these rules as the
Compiler telling you "I can't safely help here" — not a style nitpick.

## Further reading

- [React Compiler 1.0](https://react.dev/blog/2025/10/07/react-compiler-1)
- [Rules of React](https://react.dev/reference/rules)
- [eslint-plugin-react-hooks reference](https://react.dev/reference/eslint-plugin-react-hooks)
- [`Array.prototype.toSorted` — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted)
