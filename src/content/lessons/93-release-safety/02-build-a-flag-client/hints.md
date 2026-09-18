Start with `evaluate`'s precedence as a sequence of early returns, in this exact order:
missing flag check first (so everything below can assume the flag exists), then kill
switch, then rules, then rollout, then default.

---

`fnv1a` needs `Math.imul` for the multiply so it stays a 32-bit signed int the way JS
engines represent it, and `>>> 0` at the end to reinterpret that as unsigned before you
take `% 100`. Without `>>> 0` you can end up computing a bucket from a negative number.

---

A rule matches when *every* key in `rule.if` equals the same key's value in
`context.attributes` — use `Object.entries(rule.if).every(...)`, not `.some(...)`. Read
`rules` in the array's given order and return on the first match; don't collect all
matches and pick one.

---

For the rollout, the percentage check is `bucket < percentage`, not `<=`. A 0%
rollout should still report `reason: 'rollout'` (not fall through to `'default'`) because
the rollout rule *did* apply — it just decided "no" for this user. Default `salt` to
`'v1'` when the caller doesn't provide one.

---

`update` needs to merge `partial.attributes` into the *existing* attributes object, not
replace it wholesale — otherwise a caller who only wants to add one attribute wipes out
the others. After merging, call every listener in `listeners`.

---

`useFlag` should not just call `client.evaluate(key)` once at render time — nothing would
ever tell React to re-render when the flag's value changes later. Subscribe in a
`useEffect`, store the result in `useState`, and re-evaluate both on mount (in case
context changed between the initial render and the effect running) and on every
notification from `client.subscribe`.
