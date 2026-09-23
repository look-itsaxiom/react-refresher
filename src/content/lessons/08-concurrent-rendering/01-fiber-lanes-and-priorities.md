# Rendering can be interrupted

Through React 17, rendering was synchronous and all-or-nothing: once React started walking your component tree, it ran to completion on the main thread. A big update — a large list, a deeply nested tree — could block input and scrolling for the whole render. React 18's **concurrent renderer** changed the underlying work loop so that render can be paused, resumed, or thrown away, without ever showing the user a half-finished screen.

## The fiber work loop, briefly

Each component instance in the tree is represented by a **fiber**, a plain JS object holding the component type, its pending work, and pointers to its parent/child/sibling fibers. Rendering is a loop that walks this fiber tree one unit of work at a time: render a component, get its children, move to the next fiber. Because the "current position" lives in data (the fiber and a work-in-progress tree), not on the call stack, React can stop after any unit of work, hand control back to the browser to paint or handle an input event, and pick the loop back up later. This is **time slicing**: React works in chunks of roughly 5ms, checks whether it should yield, and if the browser has something more urgent to do, it yields.

Two trees exist at once: the **current** tree (what's on screen) and a **work-in-progress** tree (what's being built). The commit phase swaps them in one synchronous step, so the DOM never shows a partially-rendered tree — interruption happens only during the render phase, never mid-commit.

## Lanes: priority, not just a queue

Legacy React had one kind of update. Concurrent React assigns every update a **lane** — a priority bucket such as `SyncLane` (must happen this tick: most discrete events like clicks and keypresses), `DefaultLane` (normal updates), or one of several `TransitionLane`s (explicitly marked non-urgent). When multiple updates are pending, React works on the highest-priority lane first and can **interrupt** in-progress work on a lower lane if something more urgent comes in — a keystroke arriving while a big transition render is underway wins immediately. This is why `startTransition` matters: it doesn't make anything faster, it tells React "this update is allowed to lose."

`useTransition`'s `isPending` flag reflects lane state, not a timer: it's `true` from the moment you call `startTransition` until the transition's work has committed, regardless of how long that takes.

## Render must be pure — this is not new advice, it's a requirement

Concurrent rendering is only safe if render functions are pure: same props/state in, same JSX out, no visible side effects. React now depends on this in ways it didn't in 2019:

- **A render can be started, thrown away, and started again** for the same commit (React discards an interrupted work-in-progress tree and restarts it later, sometimes with the same props). If your component pushed to an array or called `Date.now()` and stored it, the discarded attempt already did that work — twice, for one visible update.
- **Two components can be prepared before either commits.** React may render a low-priority tree partway, pause it, and start a different high-priority one that touches shared mutable state.
- **`StrictMode` deliberately exploits this** by double-invoking pure functions in development to catch violations before they cause the intermittent, hard-to-reproduce bugs that impure rendering produces in production concurrent rendering. More on that in the next concept.

"Pure" specifically means: don't mutate any variable, object, or array that existed before the render started (props, state, module-level variables, refs read directly during render); don't call impure APIs (`Date.now()`, `Math.random()`, network calls) and rely on their result inside render's own logic; don't write to `ref.current` during render for anything other refs designed for that (e.g., `useRef` lazy-init guards). Reading `Date.now()` for display is fine only if you can tolerate that the number rendered may not correspond 1:1 with wall-clock calls — you cannot use it to drive logic that must be idempotent, like counting how many times something rendered.

## `createRoot` and automatic batching

React 18's `createRoot(container).render(<App />)` replaced the legacy `ReactDOM.render(<App />, container)` (removed entirely in React 19 — calling it now throws). `createRoot` is what opts an app into the concurrent renderer at all; without it, none of the above lane/interruption machinery runs, and transitions/`Suspense`'s streaming behaviors degrade to synchronous ones.

The same change brought **automatic batching**: every `setState` call within a single browser task — inside promises, `setTimeout`, native event listeners, not just React's own synthetic event handlers — is now batched into one re-render. Before React 18, only updates inside React event handlers batched; a `setTimeout` callback with three `setState` calls used to trigger three renders. `ReactDOM.flushSync(fn)` is the escape hatch when you need a synchronous, un-batched commit (rare — mostly measuring layout right after a specific update).

## Further reading (optional)

- [React docs — Rendering Logic Must Be Pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure)
- [React docs — `createRoot`](https://react.dev/reference/react-dom/client/createRoot)
- [React docs — `startTransition`](https://react.dev/reference/react/startTransition)
- [React working group — concurrent rendering behind the scenes](https://github.com/reactwg/react-18/discussions/37)
