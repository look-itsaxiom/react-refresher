Sort the requests by `t` first -- the input order isn't guaranteed, and everything else
assumes you're processing them chronologically.

---

For `server`, don't touch `model.coldStartMs`/`idleTimeoutMs`/`maxConcurrencyPerInstance`
at all -- they're irrelevant to this branch. Latency is always `durationMs`, and
`instanceSeconds` only needs the single largest `t + durationMs` across every request.

---

For `function`/`isolate`, track each instance as a small list of "when will this
request currently on me finish" (`activeEnds`). At time `t`, an end value still counts
as active only if it's `> t`. Filter that list down before checking capacity or
retirement, and keep the filtered list around if you end up reusing that instance.

---

Retirement only applies to an instance with *zero* active requests right now. If it's
still handling something, it's never retired regardless of how long ago it started --
only an idle instance can time out. Track "when did this instance's last request end"
separately from "what's active right now" so you can still check idle time after
everything active has drained.

---

`instanceSeconds` is computed differently per branch: for `server` it's one wall-clock
span; for `function`/`isolate` it's a running sum you add to as you go, one `latency /
1000` per request (including cold-start time for whichever request paid it). Don't try
to share one formula between the two branches.
