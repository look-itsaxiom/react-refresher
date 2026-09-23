# StrictMode's double-invocations, and transitions that await

## What `<StrictMode>` actually does

`StrictMode` adds no UI and ships no code to production; it only changes development behavior, by calling certain functions **twice** so impurities show up as visible bugs instead of latent ones. Per the React docs, it double-invokes:

1. **Component function bodies** — the top-level logic of every render, not code inside event handlers.
2. **Functions passed to `useState`, `useReducer`, and `useMemo`** — lazy initializers and memo callbacks, since these are supposed to be pure computations.
3. **Effects** — every `useEffect`/`useLayoutEffect` gets one extra setup+cleanup cycle: `setup → cleanup → setup`, immediately, in development only.
4. **Callback refs** — same extra `setup → cleanup → setup` cycle as effects.

None of this is random or flaky: it happens deterministically, every time, in development builds. A component that mutates a module-level array during render will visibly have too many entries after mount, before you've clicked anything. An effect that subscribes to something without a matching unsubscribe in its cleanup will end up with two live subscriptions. These are exactly the bugs concurrent rendering can trigger silently in production (a discarded, restarted render re-running your side effect; a component remounting and re-subscribing without cleanup) — StrictMode just makes them happen on every dev render instead of occasionally in production.

The fix is never "avoid triggering StrictMode" — it's making the function honestly idempotent: derive values instead of mutating shared state, and give every effect a cleanup that undoes exactly what its setup did.

## `useDeferredValue`'s `initialValue`

`useDeferredValue(value, initialValue?)` returns a lagging copy of `value`: on updates, React first re-renders with the old deferred value (so the expensive consumer doesn't re-run immediately), then re-renders again in the background with the new one. As of React 19, it takes an optional second argument: on the *first* render only, the hook returns `initialValue` instead of `value` itself. Without it, there's no "old value" to fall back to on mount, so the first render just uses `value` directly and nothing is deferred yet — the argument matters when you want the very first paint to show a placeholder (like an empty list) rather than eagerly computing the expensive view for the initial value.

## `startTransition` with an async function (Actions)

React 19 lets the function you pass to `startTransition` be `async`. `isPending` switches to `true` at the call and, per the docs, "stays `true` until all Actions complete and the final state is shown to the user" — spanning the `await`, not just the synchronous part.

There's a sharp edge worth knowing before you rely on it: the function body runs synchronously up to its first `await`, and React only automatically treats state updates *before* that `await` as transition-priority. State updates written *after* an `await` are not automatically marked, because JavaScript loses the async call's context across the microtask boundary. The documented fix is to wrap each post-`await` update in its own `startTransition` call:

```tsx
startTransition(async () => {
  const result = await fetchSomething();
  startTransition(() => {
    setResult(result); // must be re-wrapped to stay a transition
  });
});
```

This is a "known limitation" React's team has said they intend to fix; today, treat every `await` inside a transition action as a reason to re-wrap what follows.

## Where the Compiler fits in

The React Compiler (stable since React 19) auto-memoizes components and values by statically proving they're safe to skip re-computing — but that proof only holds if your code follows the Rules of React, the same purity rules concurrent rendering needs: no mutating props/state/module-level variables during render, no calling hooks conditionally. The Compiler doesn't add new constraints; it makes existing purity violations matter more, because a component the Compiler wrongly assumes is pure can now return a stale memoized result instead of just double-invoking harmlessly under StrictMode. Practically: code that passes StrictMode's double-invocation cleanly is a good sign the Compiler will memoize it correctly.

## Interview angle

Reassigning a task, changing a dependency, or inviting a vendor are all async writes that should keep the UI responsive while they're in flight, which is exactly what Actions and transitions are for. A strong answer ties `startTransition`'s async form to a concrete action, like submitting a "move task to vendor's board" mutation, and can explain that `isPending` stays true across the `await`, not just the synchronous part, so a saving indicator doesn't flip off early. It should also connect `useDeferredValue` to filtering a large dependency graph or task list by keyword: keep the input itself synchronous so typing never lags, and let the expensive filtered render lag one frame behind.

**Likely follow-up:** You call `startTransition(async () => { const result = await reassignTask(id); setStatus(result.status); })`. Is `setStatus` still a transition update? Walk through why or why not.

**Pitfall:** Assuming everything inside an async transition function stays marked as a transition. React only automatically treats updates before the first `await` as transition-priority; anything after has to be re-wrapped in its own `startTransition` call, or it becomes a synchronous, blocking update that defeats the point of using a transition at all.

## Further reading (optional)

- [React docs — `<StrictMode>`](https://react.dev/reference/react/StrictMode)
- [React docs — `useTransition`](https://react.dev/reference/react/useTransition)
- [React docs — `useDeferredValue`](https://react.dev/reference/react/useDeferredValue)
- [React docs — React Compiler](https://react.dev/learn/react-compiler)
