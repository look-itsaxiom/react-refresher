# When manual memoization still matters

If your code follows the rules from the last step and the Compiler is running on it, you
can delete most of the `useMemo`/`useCallback`/`React.memo` you'd have written under React
18 habits — the Compiler inserts equivalent memoization automatically, and it's better at
picking granularity than most hand-written code (it can memoize sub-expressions inside a
value, not just whole return values). But "most" isn't "all." Manual memoization is still
the right tool in a handful of specific situations, and knowing which ones keeps you from
either stripping memoization that was load-bearing or leaving in memoization that now just
adds noise.

## Referential stability as a contract with something outside the Compiler

The Compiler only compiles the component/hook code you write and that it can see. It
cannot change how a third-party library treats the props or arguments you hand it. Two
recurring cases:

- **TanStack Table (and similar libraries) expect stable `columns`/`data` references.**
  If you construct the `columns` array inline on every render, the library's internal
  `useReactTable` sees a "new" configuration each time and can drop sort/filter state or
  re-run expensive setup. The Compiler won't memoize this for you because the instability
  isn't in your component's own re-render behavior — it's a requirement imposed by code
  the Compiler doesn't own. Keep the `useMemo` here:

  ```tsx
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'score', header: 'Score' },
    ],
    [], // static shape — no dependency on props/state
  );
  ```

- **Zustand selectors that return a new object/array each call.** `useStore((s) => ({ a:
  s.a, b: s.b }))` returns a fresh object every render, which defeats Zustand's
  reference-equality check and re-renders on *every* store update, not just changes to `a`
  or `b`. The library's own fix is `useShallow`, not `useMemo` on your side:

  ```tsx
  import { useShallow } from 'zustand/react/shallow';
  const { a, b } = useStore(useShallow((s) => ({ a: s.a, b: s.b })));
  ```

  The lesson generalizes: when a library's own docs mention "reference equality" or ship a
  stability helper, that's the tool to reach for — not a reflexive `useMemo`.

## Expensive pure computation the Compiler can't see through

The Compiler reasons about JavaScript it compiles: your component and hook bodies. It does
not know that a call into a WASM module, a large third-party parsing library, or a
recursive algorithm you wrote is *expensive* — it only optimizes based on whether inputs
changed, and by default it already skips recomputing pure calls whose inputs are unchanged.
Manual `useMemo` still earns its keep across a boundary the Compiler can't instrument: code
in a `.js`/`.ts` utility file (only component/hook files get compiled), a call gated behind
a directive that opts a function out (`"use no memo"`), or genuinely heavy work you want to
visibly document as a memoization point for the next reader — comments don't show up in a
profiler, but a named `useMemo` does.

## `React.memo` at a subtree boundary with an unmemoized parent

The Compiler memoizes the component it compiles, but it can't force a *parent* to stop
re-rendering if that parent itself isn't compiled — a class component, code the Compiler
bailed out on, or a boundary where props arrive from outside React entirely (a web
component wrapper, a router integration). If an expensive subtree hangs off an unstable
parent like that, `React.memo` on the subtree's root is still the fix, exactly as before.
Once everything above and below is compiler-covered, this need mostly disappears — but
"mostly" means check, not assume.

## `useCallback` for an identity your own code depends on

The classic "avoid a wasted child re-render" use of `useCallback` is subsumed by the
Compiler wherever it's compiling both the parent and the memoized child. It is **not**
subsumed when something *else* depends on the callback's identity: a `useEffect` dependency
array where you don't want the effect re-running on every render, a subscription API
(`window.addEventListener`, a WebSocket handler) that needs the same function reference to
unsubscribe correctly, or a ref callback. In those cases the requirement isn't "reduce
re-renders," it's "this specific identity must be stable," which is a correctness
constraint the Compiler doesn't know you have.

## `useEffectEvent` instead of dependency-array gymnastics

Before `useEffectEvent` (stable since React 19.2), keeping an effect's dependency array
honest while still calling out to a callback prop that changes every render meant either
re-running the effect too often or reaching for a ref-mirroring workaround. `useEffectEvent`
wraps non-reactive logic so it always reads the latest props/state but is never itself a
reason to re-run the effect:

```tsx
function useChatRoom(roomId: string, onMessage: (msg: Message) => void) {
  const onMessageEvent = useEffectEvent(onMessage);
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('message', (msg) => onMessageEvent(msg));
    return () => connection.disconnect();
  }, [roomId]); // onMessage is intentionally not listed — onMessageEvent is not reactive
}
```

This isn't a memoization technique — it doesn't produce a stable *value* — but it solves the
problem people used to reach for `useCallback` plus a stale-closure workaround to solve, and
it's the more direct tool now.

## Verifying instead of guessing

Don't add or keep manual memoization on a hunch. Wrap the suspect subtree in
`<Profiler id="..." onRender={...}>` (from `react`) and log the `actualDuration` and
`phase` arguments, or use the React DevTools Profiler tab's "why did this render" flame
graph, before and after a change. If removing a `useMemo` doesn't change render count or
duration, it wasn't doing anything — likely because the Compiler already covers that
component. If adding one measurably drops re-render count on a component fed by an
uncompiled parent, keep it, and leave a comment saying which boundary it's protecting
against.

## Further reading

- [You Might Not Need an Effect / `useEffectEvent` — react.dev](https://react.dev/reference/react/experimental_useEffectEvent)
- [React Compiler 1.0 — react.dev](https://react.dev/blog/2025/10/07/react-compiler-1)
- [`useShallow` — Zustand docs](https://zustand.docs.pmnd.rs/hooks/use-shallow)
- [Profiler API — react.dev](https://react.dev/reference/react/Profiler)
