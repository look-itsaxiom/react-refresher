Nothing in `handleClick` currently awaits anything, so it runs start to finish as one
synchronous function call. React batches every `setState` call made during that one
synchronous run into a single render — the "pending" render and the "saved" render never
happen separately, so the browser only ever gets one frame to paint, and it's the final
one.
---
`yieldToMain()` is already provided and already does the right thing — it resolves on a
new task, using `scheduler.yield()` when it exists and a `setTimeout` fallback otherwise.
You don't need to write any scheduling code yourself; you need to `await` it in the right
two places: once right after `setPending(true)`, and once after processing each chunk
inside the loop.
---
```tsx
async function handleClick() {
  setSaved(false);
  setPending(true);
  await yieldToMain();

  let total = 0;
  for (const chunk of chunked(DATA, CHUNK_SIZE)) {
    total += crunch(chunk);
    await yieldToMain();
  }
  void total;

  setSaved(true);
  setPending(false);
}
```
The first `await yieldToMain()` is what lets the pending render actually paint before any
`crunch` call runs. The one inside the loop is what keeps the whole 20-item computation
from running as a single uninterrupted long task — each chunk becomes its own task, with a
real yield point between them.
