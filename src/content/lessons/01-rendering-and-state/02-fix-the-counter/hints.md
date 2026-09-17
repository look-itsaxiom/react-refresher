Each render gets its own `count`. Inside one click handler, `count` never changes, no matter how many times you call `setCount`.
---
`setCount` accepts a function: `setCount(c => c + 1)`. React calls it with the most recent value in the queue.
---
The delayed button has the same problem in disguise: the timer closure captured `count` from the render it was created in. Use an updater there too.
