`SearchBox` filters a 3,000-item list through `findMatches`, which simulates a slow lookup (a real fetch or a slow synchronous scan would look the same to React). Right now there's no feedback while a filter is in flight, and the results list has no way to show it — `data-pending` is hardcoded to `"false"`.

Add a pending indicator using `useTransition`, without making typing itself feel slower:

1. The `<input>`'s value must update immediately on every keystroke, even while a previous filter is still running.
2. While a filter triggered by the latest keystroke is in flight, the results `<ul>` must have `data-pending="true"`; once that filter's results are applied, it must go back to `"false"`.
3. `findMatches` and the overall shape of `App` stay as they are — only wire up the transition.

Remember: `startTransition`'s callback may be `async`, but state updates written *after* an `await` need to be wrapped in their own `startTransition` call to stay non-urgent — the callback's synchronous portion is the only part React marks automatically.
