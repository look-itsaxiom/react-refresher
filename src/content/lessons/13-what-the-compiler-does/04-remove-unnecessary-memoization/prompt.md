`FilteredList` has two problems, both about manual memoization:

**Note on this exercise:** your code runs through Sucrase in this sandbox, not the React Compiler — so removing memoization here isn't "trusting the compiler to handle it," it's recognizing that this particular memoization was never earning its keep, and fixing a real correctness bug that a stale `useMemo` dependency array introduced.

1. **Unnecessary memoization.** `handleQueryChange` is wrapped in `useCallback` for no reason: nothing downstream needs it to keep the same identity across renders, and it doesn't wrap anything expensive. It's not wrong, just noise — remove it (or otherwise simplify it away) without changing what happens when you type in the search box.
2. **A stale `useMemo` hiding a real bug.** `filtered` depends on both `query` and `tag`, but the dependency array only lists `query`. That means changing the category dropdown alone doesn't recompute the filtered list — you'll see the *previous* query's results until `query` happens to change too. Fix the dependency list (or restructure the computation) so selecting a category filters immediately, and so it combines correctly with an active search.

Checks only look at what's rendered in the DOM after interacting with the search box and category dropdown — any correct fix, with or without `useMemo`, will pass.
