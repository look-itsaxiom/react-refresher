# What the Compiler does

React Compiler reached 1.0 on October 7, 2025. It is a build-time tool, not a runtime library: it reads your components and hooks as plain JavaScript/TSX, proves which values and JSX trees can safely be skipped on a re-render, and rewrites the code to skip them. Nothing changes about how you write components. What changes is that `useMemo`, `useCallback`, and `React.memo` — the defaults you reached for whenever a re-render was too expensive — become escape hatches for the rare case the compiler can't cover, not the everyday tool.

## What compiled output actually looks like

Point the [Compiler Playground](https://playground.react.dev) at a component like this:

```tsx
function ProductList({ products, query }: { products: Product[]; query: string }) {
  const filtered = products.filter((p) => p.name.includes(query));
  return (
    <ul>
      {filtered.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

and the compiled output imports a memo cache and gates every derived value behind a dependency check:

```tsx
import { c as _c } from 'react/compiler-runtime';

function ProductList({ products, query }: { products: Product[]; query: string }) {
  const $ = _c(4); // one memo cache slot allocated per source location that needs one
  let filtered;
  if ($[0] !== products || $[1] !== query) {
    filtered = products.filter((p) => p.name.includes(query));
    $[0] = products;
    $[1] = query;
    $[2] = filtered;
  } else {
    filtered = $[2];
  }
  let t0;
  if ($[3] !== filtered) {
    t0 = (
      <ul>
        {filtered.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    );
    $[3] = filtered;
    // cache slot 4 reserved for the returned JSX
  } else {
    t0 = $[4];
  }
  return t0;
}
```

`_c(4)` allocates a `$` array — the **memo cache** — with one slot per value or JSX subtree the compiler decided was worth memoizing. On each render it compares the current inputs (`products`, `query`, `filtered`) against what's stored in the cache; if nothing relevant changed, it reuses the cached value instead of recomputing. This is structurally the same idea as `useMemo`, but the compiler places the checks and picks the granularity for you, down to individual JSX expressions, not just whole return values. It also memoizes conditionally — including branches after an early `return` — which a top-level `useMemo` call can't do, since a hook call can't sit inside an `if`.

Open React DevTools on a compiled app and components the compiler optimized show a small "Memo ✨" badge next to their name in the tree. That badge, not reading the transpiled output, is the day-to-day way to check whether a given component got optimized.

## What it memoizes, and what it deliberately skips

The compiler memoizes:

- **Values** computed from props, state, or context — array/object literals, `.filter()`/`.map()`/`.sort()` results, derived numbers.
- **JSX** — entire returned trees or sub-trees, so a parent re-render doesn't force children to re-render if their JSX would be identical.
- **Callbacks** defined in a component, so a function prop passed to a memoized child keeps referential identity across renders where its dependencies didn't change.

It skips a component entirely — leaving it unmemoized and unchanged — when it can't prove the component is safe to memoize. Two ways that happens:

1. **The component or hook violates the Rules of React** (mutating a prop, calling a hook conditionally, reading a ref during render — covered in the next section) and the compiler's static analysis detects it. The compiler bails out silently by default; nothing crashes, you just get the code you wrote, unmemoized. As of 1.0, the compiler also uses heuristics for code it *can't* fully prove safe or unsafe — most of the app compiles by default in **infer** mode.
2. **You tell it to skip a function** with the `"use no memo"` directive, placed as the first line of the function body (before any other statement, comments excluded). This is meant as a temporary, surgical escape hatch — for a component you suspect is misbehaving under compilation and want to rule out while debugging — not a long-term annotation.

There's a third, narrower mode worth knowing even though this project doesn't use it: `compilationMode: 'annotation'`. In that mode the compiler flips the default and skips everything *except* functions that start with `"use memo"`. It exists for large, uneven codebases doing an incremental rollout — annotate the components you've reviewed and let the rest opt out by default — and is covered further in the next section.

## Why this changes how you write `useMemo` and `useCallback`

Before the compiler, manual memoization was a performance tool you reached for reactively: a component re-rendered too often, you profiled it, you wrapped the expensive part in `useMemo` or the child in `React.memo`. That workflow had two costs. Correctness cost: a wrong or missing dependency in the array is a silent bug — stale values that don't update, or effects that fire on every render because a callback's identity churns. Ergonomic cost: `useMemo(() => computeThing(a, b), [a, b])` repeats `a` and `b` twice and gets harder to read as the computation grows.

The compiler's static analysis produces both a more complete dependency list (including things developers routinely miss, like an optional chain's intermediate values, or an array index used as a key) and a finer-grained one (per JSX expression, not per component). That's why the React team's guidance since 1.0 is: for new code, don't add manual memoization at all — write the plain version and let the compiler do the analysis. Manual `useMemo`/`useCallback`/`memo` remain correct, and the compiler leaves memoization you already wrote alone by default via a `preserve-manual-memoization` rule, but they're now precision tools for cases the compiler can't reach — memoizing a value across a compiler-skipped component boundary, or forcing referential stability into a fussy third-party library that does its own `===` checks.

The concept step after next covers the Rules of React the compiler leans on to make all of this sound, and how to adopt the compiler incrementally in a codebase that isn't rule-clean everywhere yet.

## Further reading

- [React Compiler — react.dev/learn/react-compiler](https://react.dev/learn/react-compiler)
- [React Compiler v1.0 announcement, Oct 7, 2025](https://react.dev/blog/2025/10/07/react-compiler-1)
- [React Compiler directives — react.dev](https://react.dev/reference/react-compiler/directives)
- [React Compiler Playground](https://playground.react.dev)
