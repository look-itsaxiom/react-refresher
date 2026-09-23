`FetchAll` and `Counter` are the concurrent versions of code you'd write sequentially in
TypeScript as `await Promise.all(ids.map(fetch))` with a concurrency limiter bolted on.
Implement them, in `fetchall.go`:

- **`FetchAll(ids []string, fetch func(id string) (int, error), maxConcurrent int) ([]Result,
  error)`** — call `fetch` for every id, with at most `maxConcurrent` calls in flight at once
  (a buffered channel used as a semaphore is the idiomatic way to bound this). Return the
  results in the same order as `ids`, regardless of which fetch finishes first. If any `fetch`
  call returns an error, `FetchAll` should return that error; goroutines already in flight may
  keep running to completion, but none should ever be left blocked forever (no leaked
  goroutines — every one you start must be able to exit).
- **`Counter`** — a count that many goroutines can call `Inc()` on at once without corrupting
  it. `Value()` returns the current count. The starter's version isn't safe for concurrent use;
  make it safe.

The starter is a correct *sequential* implementation of `FetchAll` — it ignores
`maxConcurrent` entirely and never overlaps fetches, which is why the concurrency test below
fails on it. Getting the *values* right isn't the hard part here; getting the concurrency right
is.

Run the tests locally with the command shown on the left, or click **Run go test**.
