For `Run`, pre-allocate `results := make([]Result, len(jobs))` and hand workers *indices*
into `jobs`/`results` (an `int` channel), not `Job` values — that's what lets you write
`results[idx] = ...` and get input order for free, no matter which worker finishes first.

---

Launch all `workers` goroutines up front, each doing `for idx := range indicesChan { ... }`,
and use a `sync.WaitGroup` to know when they've all exited. A dispatcher loop feeds
`indicesChan` with a `select` between `indicesChan <- idx` and `<-ctx.Done()`; when
`ctx.Done()` wins, stop the loop and remember `ctx.Err()` to return. Close `indicesChan`
after the loop (however it ended) so every worker's `range` terminates and `wg.Wait()`
actually returns — that's what keeps "no goroutine leak" true even on cancellation.

---

Don't have workers check `ctx` mid-`fn` — the requirement is only that the dispatcher
stops *handing out new work* after cancellation; a job a worker already dequeued should
finish normally and its result should still land in the slice.

---

For `LoadConfig`, parse each env var independently and validate range *after* defaults
and overrides are both applied — collect problems into a `[]error` as you find them
(`errs = append(errs, fmt.Errorf("%w: ...", ErrInvalidConfig, ...))` for each one), then
`return Config{}, errors.Join(errs...)` only if `len(errs) > 0`. `errors.Join` on a `nil`
or empty slice would itself be a bug to avoid — check the length first.

---

`errors.Is` walks a joined error's `Unwrap() []error` looking for a match anywhere in the
tree, so as long as each individual message was built with `fmt.Errorf("%w: ...", ErrInvalidConfig, ...)`,
`errors.Is(joined, ErrInvalidConfig)` is `true` regardless of how many other errors got
joined alongside it.
