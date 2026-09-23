# The fixes, in order of leverage

Once you've found the expensive commit, the fix depends on what's actually expensive.
This is the checklist, roughly in order of how much a fix buys you versus how much it
costs to write and maintain — start at the top.

## 1. State colocation and lifting boundaries

The single highest-leverage fix is also the one with zero runtime cost: move state to
the component that actually needs it, and keep everything else out of its re-render path.
A `filter` string used by one input and one list doesn't belong in the page-level
component — every unrelated sibling pays for every keystroke if it does. Push it down into
the smallest component that owns it.

The complementary move is pushing *content* up: when a component that owns fast-changing
state also renders expensive children that don't depend on that state, pass those children
in as `children` (or another element-typed prop) from a parent that itself never
re-renders. React compares `children` by reference, and a parent that creates that element
exactly once during its own single render hands down something that never looks "changed."
This is the fix behind the classic "wrap the expensive child around the input, not the
other way around" advice, and it needs no `memo`, no `useMemo` — it works because nothing
ever asks the expensive subtree to re-render in the first place.

## 2. Memo boundaries where the Compiler can't help

React Compiler (stable as of 1.0, shipped in React 19) auto-memoizes components and
values in code that follows the [rules of React](14-compiler-friendly-code) — but it bails
out per-component on any violation, and it only runs on code you compile. Two situations
still need `React.memo`, `useMemo`, or `useCallback` by hand:

- **Code the Compiler doesn't see.** Anything outside your build's compile scope: a
  dependency's source, code excluded by a lint-suppressed directory, this course's own
  sandbox (which compiles with Sucrase, not the Compiler — every memoization exercise here
  is manual on purpose).
- **A correctness contract, not a render-count optimization.** A callback identity that a
  subscription API, a `useEffect` dependency, or a non-React library needs to stay stable
  is not something the Compiler reasons about — it optimizes *your* rendering, not a
  contract external code imposes on you.

## 3. Split contexts by rate of change

A single `AppContext` holding `{ user, theme, notifications }` means every consumer
re-renders on every notification, even the components that only ever read `theme`. Split
by how often each piece changes and who reads what: `UserContext`, `ThemeContext`,
`NotificationsContext` as separate providers. Consumers that only touch `theme` stop caring
about notifications entirely — no `memo`, no selector library, just narrower subscriptions.

For state that lives outside React entirely (a WebSocket connection, a browser API, a
non-React store), `useSyncExternalStore` takes this further: pass it a selector so a
component re-renders only when the *slice* it reads changes, not on every store update.
Several state libraries (Zustand, Jotai) build their React bindings on exactly this hook.

## 4. `useDeferredValue` and transitions for input-heavy UI

Covered in depth in [concurrent rendering](08-concurrent-rendering) — the short version for
performance work specifically: when a fast-changing value (search text, a slider) feeds an
expensive derived render (a filtered table, a chart), keep the input itself synchronous and
defer the expensive part with `useDeferredValue`. `startTransition` / `useTransition` does
the same thing for state updates you trigger yourself rather than a value you receive. Both
tell React "this update can be interrupted by something more urgent" — they don't make the
work cheaper, they make it preemptible.

## 5. `<Activity>` to warm the next screen

Covered in depth in [Activity, useEffectEvent, ViewTransition](24-activity-effect-events-view-transitions).
For performance specifically: mounting the likely-next screen inside
`<Activity mode="hidden">` while the current screen is visible means its initial render —
including any expensive work done directly during that render, like a lazy `useState`
initializer — happens in the background before the user asks for it. Switching `mode` to
`"visible"` when they navigate is then just a flip, not a mount from zero. **Effects are
the exception**: a hidden `<Activity>` subtree never runs its `useEffect`s at all, so
effect-driven setup (a subscription, a fetch kicked off from an effect) still waits for the
transition to visible — it's the render-phase work that gets a head start, not the
post-commit work. This is speculative pre-rendering: appropriate for a next step in a
wizard or an adjacent tab, not for every route in the app.

## 6. Virtualize long lists

Rendering 10,000 DOM nodes is expensive regardless of how well-memoized each one is — the
diff and the layout cost scale with what's actually in the DOM. List virtualization
(`@tanstack/react-virtual`, `react-window`) renders only the rows currently in (or near) the
viewport and recycles DOM nodes as the user scrolls, so cost stays roughly constant
regardless of list length. Reach for it once a list is long enough that scrolling itself
feels janky, not preemptively for every list.

## 7. `React.lazy` for cold paths

Not every performance problem is a render — a component that isn't on screen yet doesn't
need to be in the initial JavaScript bundle. `React.lazy(() => import('./Settings'))` plus
`<Suspense>` splits a rarely-visited route or a below-the-fold widget into its own chunk,
so the initial bundle (and the parse/compile cost that comes with it) shrinks. Pair this
with `<Activity>` where you want the lazy chunk to load speculatively rather than only on
navigation.

## 8. Avoid effect cascades

`setState` inside a `useEffect` that itself was triggered by a `setState` is a common,
easy-to-miss source of extra commits: each update schedules a render, commits, runs
effects, and if an effect sets state, schedules another render — a chain of commits for
what should have been one. Derive values during render instead of syncing them through an
effect wherever possible ("[You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)"
is the canonical guide); when an effect genuinely needs to update state (subscribing to an
external store, responding to a prop by resetting local state), keep the chain as short as
one hop and verify with the Profiler that you see one extra commit, not three.

## 9. Find the heavy import

Runtime fixes don't help a slow *load*. Bundle analysis finds the dependency that's
bloating what ships to the browser: `rollup-plugin-visualizer` or `vite-bundle-analyzer`
generate a treemap of your production bundle straight from your Vite (Rolldown-powered as
of Vite 8) build output, and `source-map-explorer` does the same working backward from
source maps when you don't control the build config directly. The usual culprits are a
full date library pulled in for one format call (prefer the platform `Intl` API or a
tree-shakeable alternative), an icon package imported as a barrel (`import { Home } from
'icon-library'` can still pull in the whole set depending on how the package is built —
check the treemap, don't assume), and `lodash` imported wholesale instead of per-function
(`lodash-es` or `lodash/specific-function`). Run the analyzer after any dependency upgrade,
not just once at project start — a minor version bump can silently un-tree-shake something
that used to be fine.

## Interview angle

A dependency graph or task board with a few thousand rows is the canonical case this checklist is built for, and the interview signal isn't knowing every tool, it's picking the right one in order. If a filter input feels laggy because the whole board re-renders per keystroke, the first move is state colocation (does the filter string need to live above the board at all?), not reaching for `React.memo` on every row. If the board itself is thousands of DOM nodes, virtualization is the actual fix, not memoization, since the cost is in the DOM, not re-computation. A strong answer can also explain why `<Activity>` matters for a "next likely screen" pattern specific to this kind of app, like pre-rendering a task's detail pane while its row is hovered, so opening it is a mode flip instead of a mount from zero.

**Likely follow-up:** The task board is slow specifically when you type in the filter box, but fast otherwise. Walk through your diagnosis before proposing a fix: what would make you reach for colocation versus `useDeferredValue` versus virtualization?

**Pitfall:** Jumping straight to `useMemo`/`useCallback`/`React.memo` as the first move on any slow list, without first checking whether the state causing the re-render even needs to live where it does. Memoizing a re-render that colocation would have prevented entirely adds maintenance cost for no leverage.

## Further reading (optional)

- [react.dev: Performance](https://react.dev/learn/render-and-commit)
- [web.dev: Optimize React apps](https://web.dev/articles/react)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [Vite: bundle analysis](https://vite.dev/guide/build.html)
