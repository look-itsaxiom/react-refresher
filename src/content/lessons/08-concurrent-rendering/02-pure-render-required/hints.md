Everything at the top level of a component function is the "render body" — it runs every time React calls the function, and under `<StrictMode>` in development that's twice per commit. Anything that mutates shared state (like pushing to `log`) has to move somewhere that only runs once per real user action.

---

Move the `log.push(...)` call out of the component body and into `onClick` (or a named handler the button calls). Event handlers are never double-invoked by StrictMode, only render bodies, effects, and state initializers are.

---

The fix doesn't need a `useEffect`, a `useRef` guard, or removing `<StrictMode>`. It's a one-line move: call `log.push(...)` inside the same function that calls `setTick`, in response to the click, instead of unconditionally at the top of `LogPanel`.
