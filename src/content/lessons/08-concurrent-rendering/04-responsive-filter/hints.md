`useTransition()` returns `[isPending, startTransition]`. Keep `setText(next)` outside of `startTransition` — it needs to be urgent so the input never lags.

---

Wrap the filtering work in `startTransition(async () => { ... })`. Set `data-pending={isPending ? 'true' : 'false'}` on the `<ul>`.

---

Inside that async callback, the `await findMatches(next)` line means anything after it runs outside the part React automatically marks as a transition. Wrap the `setResults(matches)` call in its own nested `startTransition(() => { setResults(matches); })`.
