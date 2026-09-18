This sandbox's jsdom has no layout engine — `getBoundingClientRect()` and `offsetTop`
always return zero, so there's nothing real to measure. Instead, `createLayout()` below
gives you a fake DOM that models the one thing that actually matters for this exercise:
**reading a position right after writing one is expensive, and reading one after another
read (or before any write) is free.**

`layout.read(index)` returns that item's current top offset. `layout.write(index, value)`
records a new one. Every time a `read` happens immediately after a `write`, the fake
increments `layout.forcedLayouts` — modeling a forced synchronous layout, the cost of
asking the real browser for geometry while a style change is still pending.

`positionItems(layout, count)` is supposed to nudge every item down by 4px from wherever
it currently is. It works — the positions it returns are correct — but it alternates
`read`, `write`, `read`, `write` once per item, so after the first iteration every
subsequent read is a forced layout. Fix it so it reads every current position first, then
writes every new position, without changing what it returns.

Do not change `createLayout`, the `LayoutRecorder` type, or the function signature of
`positionItems`. `App` already calls `positionItems` and displays the result — you
shouldn't need to touch it.
