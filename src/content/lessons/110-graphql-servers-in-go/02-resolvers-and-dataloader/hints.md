Give `Loader` a mutex-guarded `cache map[K]V` and check it at the top of `Load`, before doing
anything else -- a cache hit should return immediately with no batching logic involved at all.

---

Model one in-flight group as a struct holding the keys seen so far and, per key, the list of
channels waiting on it (a key can be requested more than once before the group flushes). Store
a pointer to the current group on the loader; `Load` either joins the existing group or starts
a new one (and, for a new group, starts a `time.AfterFunc(wait, ...)` that flushes it).

---

Flushing has two triggers racing each other: the timer firing, or a `Load` call pushing the
group's unique key count to `maxBatch`. Guard against both firing: when a flush runs, check
under the lock that the group it was asked to flush is still the loader's *current* group --
if the other trigger already handled it, this one is a no-op.

---

When a group flushes, call `batchFn` once with the group's unique keys, then walk the result:
for each key, look it up in the returned map, write it into the shared cache, and send it (or
a "missing key" error) to every channel that registered for that key.

---

For `ResolveProjects`: build a `views := make([]ProjectView, len(projects))` up front and an
`errs := make([]error, len(projects))` alongside it. Each project's goroutine writes only to
`views[i]` and `errs[i]` for its own `i` -- no shared mutable state between goroutines, so no
mutex is needed there. `wg.Wait()`, then scan `errs` for the first non-nil one before returning
`views`.

---

Near-solution shape for the flush trigger inside `Load`:

```go
l.mu.Lock()
b := l.cur
if b == nil {
	b = &pendingBatch[K, V]{ctx: ctx, chans: make(map[K][]chan loadResult[V])}
	l.cur = b
	b.timer = time.AfterFunc(l.wait, func() { l.flush(b) })
}
ch := make(chan loadResult[V], 1)
b.chans[key] = append(b.chans[key], ch)
flushNow := len(b.chans) >= l.maxBatch
if flushNow {
	b.timer.Stop()
}
l.mu.Unlock()
if flushNow {
	l.flush(b)
}
res := <-ch
return res.val, res.err
```

`flush` clears `l.cur` (only if it still points at `b`), calls `batchFn` once outside the lock,
then re-locks to fan results into the cache and out to every waiting channel.
