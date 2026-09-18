`useTransition()` returns `[isPending, startTransition]`. Wrap the `setTab` call: `startTransition(() => setTab(next))`.
---
`data-pending` must be the string `"true"` or `"false"`, so write `data-pending={isPending ? 'true' : 'false'}`.
---
Do not remove the Suspense boundary. It is still needed for the first time Posts renders; the transition just keeps old content visible instead of showing the fallback.
