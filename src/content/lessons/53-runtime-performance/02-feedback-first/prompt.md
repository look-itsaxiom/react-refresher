# Feedback first, then the heavy work

`SaveButton` needs to summarize 20 numbers with `crunch`, a synchronous function heavy
enough to matter (don't call it more than the loop below already does, and don't change
its implementation). Right now, clicking the button goes straight from "Save" to "Saved"
with no visible in-between state, because nothing yields between showing the pending state
and doing the work — the browser never gets a chance to paint the pending frame before the
synchronous work finishes.

Fix `handleClick` so the sequence is actually observable, not just logically present:

1. Set `pending` to `true` (and clear `saved`).
2. `await yieldToMain()` once, so the pending render actually paints before any heavy work
   starts.
3. Process `DATA` in chunks of `CHUNK_SIZE` using `chunked(DATA, CHUNK_SIZE)`. For each
   chunk, call `crunch(chunk)` and add its result to a running total, then
   `await yieldToMain()` again before moving to the next chunk.
4. Set `saved` to `true` and `pending` to `false`.

`crunch`, `chunked`, and `yieldToMain` are provided — call them, don't reimplement them.
`yieldToMain` already picks `scheduler.yield()` when it exists and falls back to a
`setTimeout` yield otherwise; it also counts every call in the exported `yieldCount`, which
the checks read.

The button should render `disabled` and `aria-busy="true"` while `pending` is `true`, and
show "Save" / "Saving…" / "Saved" as its label for the three states.
