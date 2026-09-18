`Leaderboard` has two Rule-of-React violations. Neither one throws an error — the preview renders something — but both make the component unsafe for the compiler to memoize, and both are visibly wrong once you look for it.

**Note on this exercise:** the sandbox compiles your code with Sucrase, not with the React Compiler, so nothing here is auto-memoized for you. You're fixing the component so it *would* be safe for the compiler to optimize, not observing the compiler do anything — that's the point: these rules matter before you ever turn the compiler on.

Find and fix:

1. **A mutated prop.** `Leaderboard` sorts `players` with `.sort()`, which reorders the array in place — the *same* array object the caller (and this component's own "registration order" list) is holding. Fix it so ranking the players never changes anyone else's view of the original array. The roster list must always show players in the order they were declared, regardless of how many times the list gets ranked.
2. **A ref mutated during render.** `clickCountRef.current` is incremented directly in the component's render body, not in response to the click that's supposed to cause it. Because React (and, in development, `<StrictMode>`) can call a render body more than once per real commit, this count drifts from the number of times "Re-rank" was actually clicked. Fix it so the count tracks real clicks exactly — right after mount, before any click, it should read `0`.

Do not remove `<StrictMode>`. Do not add `useMemo`, `useCallback`, or `React.memo` — this exercise is about correctness, not performance.
