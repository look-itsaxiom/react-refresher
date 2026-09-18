An effect that opens a connection should return a function that closes it. React calls that function before the effect re-runs (because a dependency changed) and again on unmount.
---
`notify` is recreated on every render, so if the effect depends on it, "an unrelated re-render happened" and "we should reconnect" become indistinguishable to React. The fix isn't `useCallback` — a memoized `notify` is still a dependency, and it would go stale the moment it closes over something that changes.
---
Wrap the call to `notify` in `useEffectEvent`: `const onConnected = useEffectEvent((text: string) => notify(text));`. Call `onConnected(...)` inside the effect, but leave it out of the dependency array entirely — values from `useEffectEvent` are never reactive dependencies. The effect's deps become just `[roomId]`.
