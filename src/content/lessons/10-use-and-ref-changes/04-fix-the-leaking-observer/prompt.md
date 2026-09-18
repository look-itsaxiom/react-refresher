# Fix the leaking ref callback

`ResizeAware` attaches a `FakeObserver` (a stand-in for something like `ResizeObserver`) to its `<div>` through a ref callback, but never disconnects it. Every mount creates a new observer and nothing ever tears it down — toggle the panel off and on a few times in a real app and you'd leak one observer per cycle.

`FakeObserver` tracks how many observers are currently active on its static `activeCount` field, so the leak is directly observable:

- `observe(node)` increments `FakeObserver.activeCount`.
- `disconnect()` decrements it.

Fix `ResizeAware` so mounting creates exactly one active observer, and unmounting brings the count back to zero — using a ref callback that returns a cleanup function, not a second ref or a `useEffect` bolted on next to it.
