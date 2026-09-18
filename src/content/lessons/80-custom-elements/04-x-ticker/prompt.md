`<x-ticker>` is a small element that shows an incrementing count and also reacts to window
resizes. It works, technically — but it leaks. Fix `connectedCallback`/`disconnectedCallback` so
they are **symmetric** (everything started on connect is undone on disconnect) and
**idempotent** (disconnecting when there's nothing to clean up must not throw, and reconnecting
must never leave more than one interval or listener active).

Same rule as the previous exercise: register through the exported `define(suffix)` function,
never a fixed tag name.

Current bugs in the starter, all in `XTicker`:

1. `connectedCallback` starts a `setInterval` (kept at 20ms for this exercise so tests run fast —
   a real ticker would use something like 1000ms) but there is no `disconnectedCallback` at all,
   so the interval is never cleared. Disconnecting the element (or removing it from one parent and
   never re-adding it) leaves the interval running forever, still mutating `textContent` on a
   detached node.
2. `connectedCallback` also adds a `resize` listener on `window`, again with no removal —
   another permanent leak per connection.
3. Because neither is cleaned up, reconnecting the element (disconnect, then connect again)
   stacks a second interval and a second resize listener on top of the first, and a third
   reconnect stacks a third.

Fix it so that:

- `disconnectedCallback` clears the interval (`window.clearInterval`) and removes the resize
  listener, and does so safely even if called when nothing is active.
- Use an `AbortController` for the resize listener — create one in `connectedCallback`, pass its
  `signal` to `addEventListener`, and call `abort()` in `disconnectedCallback` instead of pairing
  a named handler with `removeEventListener`.
- After any number of connect/disconnect cycles, at most one interval and one resize listener are
  ever active at a time.

You don't need to change what the ticker renders, only its lifecycle hygiene.
