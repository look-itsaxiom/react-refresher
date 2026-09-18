Store records in a `Map<string, SessionRecord>` at the closure level (one Map per
`createSessionStore()` call, not module scope -- same lesson as the request-cache
exercise two lessons back). `create` just does `map.set(id, record)`.

---

`resolve` needs to check both timeouts *before* deciding the session is alive, and it
needs to `map.delete(sessionId)` in the branch where it returns `null` for an expired
(but still present) record -- otherwise `activeCount()` can't just be `map.size`.

---

For `activeCount()`, the simplest correct approach is to iterate the map's keys and call
your own `resolve` logic on each (or literally call `this.resolve`-equivalent for each
key) so expired entries get swept and excluded consistently, rather than duplicating the
expiry math in a second place.

---

`rotate` is "resolve, and if that succeeds, create-with-the-same-data-under-a-new-id,
then delete the old key." Don't call your public `resolve` for this if calling it would
also slide the old session's timestamp right before you delete it -- that's harmless
either way here, but reading the record directly (`map.get`) and checking expiry inline
avoids the question. Either approach passes the checks as long as the old id is gone and
the new id resolves with the right `userId`.

---

`revokeAll(userId)` is a filtered delete: iterate `map.entries()`, and `map.delete(id)`
for every record whose `userId` matches.
