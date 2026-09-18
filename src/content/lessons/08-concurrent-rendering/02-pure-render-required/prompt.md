`LogPanel` is supposed to record one entry every time you click **Add entry**, and nothing else. Instead, the entry count jumps by more than one per click, and it's already non-zero right after the page first mounts.

The bug: the component pushes onto a module-level array — and calls `Date.now()` — directly in its render body, not inside the click handler. That body runs more than once per commit (React's `<StrictMode>`, already wrapping this component below, double-invokes render on purpose in development to catch exactly this).

Fix `LogPanel` so that:

1. Right after mount, the log has **zero** entries.
2. Each click of **Add entry** adds **exactly one** entry, however many times React happens to call the component function to produce that one commit.

Do not remove `<StrictMode>` — the fix is making the component tolerate double-invocation, not avoiding it. Keep the `data-testid="entry-count"` element showing `log.length`.
