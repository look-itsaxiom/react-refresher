Make a semaphore with a buffered channel: `sem := make(chan struct{}, maxConcurrent)`. Before
each fetch, `sem <- struct{}{}` (blocks once the buffer is full); after it, `<-sem` to free a
slot — a `defer` right after the send is the easy way to guarantee the release happens.
---
Launch one goroutine per id with `wg.Go(func() { ... })` and write each result into
`results[i]` from inside that goroutine — since Go 1.22, `i` and `id` from the `for i, id :=
range ids` are fresh per iteration, so you can use them directly in the closure without a
shadowing workaround.
---
Every goroutine writes into the shared `results` slice at its own index (no data race there,
since indices never overlap) but needs a `sync.Mutex` around anything they *share* — like a
"first error seen" variable, since multiple goroutines could hit an error at close to the same
time.
---
For `Counter`, wrap `val int` in a `sync.Mutex` and take the lock in both `Inc` and `Value`.
Run the test a few times if it's not failing for you locally on the starter — an unsynchronized
counter loses updates most of the time under load, but not deterministically every time.
