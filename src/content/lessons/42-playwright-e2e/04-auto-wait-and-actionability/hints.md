`expectEventually` is a `while (true)` loop: check the predicate, return on `true`, otherwise
record the message, check elapsed time (`opts.clock.now() - start`) against `opts.timeout` and
throw if you're past it, otherwise `await opts.clock.sleep(opts.interval)` and loop again. Compute
`start` once, before the loop, from `opts.clock.now()`.

---

Don't call `opts.clock.sleep` before the first check — the "resolve immediately if already true"
requirement means the very first thing the function does is call `predicate()`, with no wait
beforehand.

---

`actionable` needs to remember the *previous* poll's `data-position` value to know whether it's
stable now. Track it in a variable that starts out meaning "nothing seen yet" (a `polled` boolean
alongside it works well) rather than priming it from an early read of the element — the very first
poll can't know whether the element is mid-animation, so it should always report "not stable," the
same way Playwright needs two consecutive matching frames before calling something settled. Update
both the flag and the stored value at the end of every predicate call, after you've used them.

---

Both functions share the same shape: an initial check, then a bounded polling loop that awaits
`clock.sleep(interval)` between attempts and throws once `clock.now() - start >= timeout`. Write
`expectEventually` first, then notice `actionable` can poll a predicate function of its own three
conditions — you're allowed to implement `actionable` by building a `() => true | string` predicate
internally and driving the same kind of loop, or by calling `expectEventually` itself.
