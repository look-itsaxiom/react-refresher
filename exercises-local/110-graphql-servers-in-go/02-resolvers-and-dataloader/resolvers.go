//go:build !solution

package resolvers

import (
	"context"
	"fmt"
	"time"
)

// Loader batches and caches lookups by key K. A real dataloader (gqlgen
// pairs with github.com/vikstrous/dataloadgen or graph-gophers/dataloader)
// collects the keys every concurrent Load call asks for during one short
// window and turns them into a single call to batchFn.
//
// TODO: this starter is a naive stand-in that does none of that -- every
// Load call hits batchFn by itself, with no batching and no cache. Fix it so
// that:
//  1. Keys arriving within l.wait of the first pending Load (or until
//     l.maxBatch unique keys have arrived) are collected into one group and
//     resolved with a single call to l.batchFn.
//  2. A key already resolved once during l's lifetime is served from cache
//     without calling l.batchFn again.
//  3. The same key requested twice within one group is only sent to
//     l.batchFn once, but every caller still gets the result.
//  4. A key l.batchFn's result map doesn't contain returns an error from
//     Load, not a zero value.
type Loader[K comparable, V any] struct {
	batchFn  func(ctx context.Context, keys []K) (map[K]V, error)
	maxBatch int
	wait     time.Duration
}

func NewLoader[K comparable, V any](batchFn func(ctx context.Context, keys []K) (map[K]V, error), maxBatch int, wait time.Duration) *Loader[K, V] {
	return &Loader[K, V]{batchFn: batchFn, maxBatch: maxBatch, wait: wait}
}

func (l *Loader[K, V]) Load(ctx context.Context, key K) (V, error) {
	var zero V
	values, err := l.batchFn(ctx, []K{key})
	if err != nil {
		return zero, err
	}
	v, ok := values[key]
	if !ok {
		return zero, fmt.Errorf("loader: no result for key %v", key)
	}
	return v, nil
}

// Loaders holds one Loader per entity type, built fresh for each incoming
// request (the same lifetime a gqlgen "loaders in context" middleware gives
// them) so caching never leaks data between requests.
type Loaders struct {
	Tasks *Loader[string, []Task]
	Users *Loader[string, User]
}

func NewLoaders(store Store) *Loaders {
	return &Loaders{
		Tasks: NewLoader[string, []Task](store.TasksByProjectIDs, 25, 5*time.Millisecond),
		Users: NewLoader[string, User](store.UsersByIDs, 50, 5*time.Millisecond),
	}
}

// ResolveProjects resolves the projects -> tasks -> assignee tree for orgID,
// the shape a GraphQL query like `projects { tasks { assignee { name } } }`
// would ask a resolver to build.
//
// TODO: this starter resolves everything sequentially and correctly, but
// without any concurrency -- fine for correctness, but it doesn't exercise
// the loaders' batching the way a real resolver tree (whose fields the
// GraphQL spec runs in parallel) would. Rewrite it to load each project's
// tasks concurrently (a goroutine per project, joined with a WaitGroup),
// while still writing results into their original positions so project and
// task order stays stable.
func ResolveProjects(ctx context.Context, store Store, loaders *Loaders, orgID string) ([]ProjectView, error) {
	projects, err := store.ProjectsByOrg(ctx, orgID)
	if err != nil {
		return nil, err
	}

	views := make([]ProjectView, len(projects))
	for i, p := range projects {
		tasks, err := loaders.Tasks.Load(ctx, p.ID)
		if err != nil {
			return nil, err
		}

		taskViews := make([]TaskView, len(tasks))
		for j, t := range tasks {
			tv := TaskView{Task: t}
			if t.AssigneeID != "" {
				u, err := loaders.Users.Load(ctx, t.AssigneeID)
				if err != nil {
					return nil, err
				}
				uu := u
				tv.Assignee = &uu
			}
			taskViews[j] = tv
		}
		views[i] = ProjectView{Project: p, Tasks: taskViews}
	}
	return views, nil
}
