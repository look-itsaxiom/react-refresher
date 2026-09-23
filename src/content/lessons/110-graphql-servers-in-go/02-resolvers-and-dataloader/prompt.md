# Build the resolver tree and its dataloader

`ResolveProjects` walks a `projects -> tasks -> assignee` tree -- the shape a resolver for
`projects { tasks { assignee { name } } }` would build -- against a `Store` that only answers
in batches:

```go
type Store interface {
	ProjectsByOrg(ctx context.Context, orgID string) ([]Project, error)
	TasksByProjectIDs(ctx context.Context, ids []string) (map[string][]Task, error)
	UsersByIDs(ctx context.Context, ids []string) (map[string]User, error)
}
```

`MemStore` (already complete, in `memstore.go`) implements `Store` and counts calls per
method in `Calls map[string]int`, so tests can catch N+1 directly.

## Part 1: `Loader[K, V]`

```go
func NewLoader[K comparable, V any](batchFn func(ctx context.Context, keys []K) (map[K]V, error), maxBatch int, wait time.Duration) *Loader[K, V]
func (l *Loader[K, V]) Load(ctx context.Context, key K) (V, error)
```

The starter's `Load` calls `batchFn` with a single-element slice every time -- correct, but
exactly the N+1 pattern this lesson is about. Fix it so:

1. Keys arriving within `wait` of the first pending `Load` call (or until `maxBatch` unique
   keys have arrived) are collected into one group and resolved with **one** call to `batchFn`.
2. A key already resolved once during the loader's lifetime is served from a cache, never
   sent to `batchFn` again.
3. The same key requested twice inside one group is sent to `batchFn` only once, but every
   caller still gets a result.
4. A key missing from `batchFn`'s result map makes `Load` return an error for that key, not a
   zero value.

## Part 2: `ResolveProjects`

```go
func NewLoaders(store Store) *Loaders
func ResolveProjects(ctx context.Context, store Store, loaders *Loaders, orgID string) ([]ProjectView, error)
```

The starter's `ResolveProjects` is correct but sequential: it resolves one project's tasks,
then the next, then the next. Rewrite it to load each project's tasks **concurrently** -- a
goroutine per project, joined with a `sync.WaitGroup` -- while still writing each project's
result into its original slot so project and task order stays stable regardless of goroutine
scheduling.

You don't need to add goroutines inside a project for its tasks' assignees -- looping over
them directly is enough. Because every project's goroutine calls `loaders.Users.Load` at
roughly the same time, their assignee lookups land in the same batch window anyway.

Run `go test ./...` inside this exercise's folder to check your work.
