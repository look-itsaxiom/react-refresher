//go:build solution

package resolvers

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type Loader[K comparable, V any] struct {
	batchFn  func(ctx context.Context, keys []K) (map[K]V, error)
	maxBatch int
	wait     time.Duration

	mu    sync.Mutex
	cache map[K]V
	cur   *pendingBatch[K, V]
}

type pendingBatch[K comparable, V any] struct {
	ctx   context.Context
	chans map[K][]chan loadResult[V]
	timer *time.Timer
}

type loadResult[V any] struct {
	val V
	err error
}

func NewLoader[K comparable, V any](batchFn func(ctx context.Context, keys []K) (map[K]V, error), maxBatch int, wait time.Duration) *Loader[K, V] {
	return &Loader[K, V]{batchFn: batchFn, maxBatch: maxBatch, wait: wait, cache: make(map[K]V)}
}

func (l *Loader[K, V]) Load(ctx context.Context, key K) (V, error) {
	l.mu.Lock()
	if v, ok := l.cache[key]; ok {
		l.mu.Unlock()
		return v, nil
	}

	b := l.cur
	if b == nil {
		b = &pendingBatch[K, V]{ctx: ctx, chans: make(map[K][]chan loadResult[V])}
		l.cur = b
		if l.wait > 0 {
			b.timer = time.AfterFunc(l.wait, func() { l.flush(b) })
		}
	}

	ch := make(chan loadResult[V], 1)
	b.chans[key] = append(b.chans[key], ch)
	flushNow := l.maxBatch > 0 && len(b.chans) >= l.maxBatch
	if flushNow && b.timer != nil {
		b.timer.Stop()
	}
	l.mu.Unlock()

	if flushNow {
		l.flush(b)
	}

	res := <-ch
	return res.val, res.err
}

// flush resolves one collected group of keys with a single batchFn call and
// fans the results out to every waiter, deduplicating by key along the way.
func (l *Loader[K, V]) flush(b *pendingBatch[K, V]) {
	l.mu.Lock()
	if l.cur != b {
		// Already flushed by the other trigger (maxBatch vs. the wait timer).
		l.mu.Unlock()
		return
	}
	l.cur = nil
	keys := make([]K, 0, len(b.chans))
	for k := range b.chans {
		keys = append(keys, k)
	}
	l.mu.Unlock()

	values, err := l.batchFn(b.ctx, keys)

	l.mu.Lock()
	for _, k := range keys {
		var lr loadResult[V]
		switch {
		case err != nil:
			lr.err = err
		default:
			if v, ok := values[k]; ok {
				lr.val = v
				l.cache[k] = v
			} else {
				lr.err = fmt.Errorf("loader: no result for key %v", k)
			}
		}
		for _, ch := range b.chans[k] {
			ch <- lr
		}
	}
	l.mu.Unlock()
}

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

func ResolveProjects(ctx context.Context, store Store, loaders *Loaders, orgID string) ([]ProjectView, error) {
	projects, err := store.ProjectsByOrg(ctx, orgID)
	if err != nil {
		return nil, err
	}

	views := make([]ProjectView, len(projects))
	errs := make([]error, len(projects))

	var wg sync.WaitGroup
	for i, p := range projects {
		wg.Add(1)
		go func(i int, p Project) {
			defer wg.Done()

			tasks, err := loaders.Tasks.Load(ctx, p.ID)
			if err != nil {
				errs[i] = err
				return
			}

			taskViews := make([]TaskView, len(tasks))
			for j, t := range tasks {
				tv := TaskView{Task: t}
				if t.AssigneeID != "" {
					u, err := loaders.Users.Load(ctx, t.AssigneeID)
					if err != nil {
						errs[i] = err
						return
					}
					uu := u
					tv.Assignee = &uu
				}
				taskViews[j] = tv
			}
			views[i] = ProjectView{Project: p, Tasks: taskViews}
		}(i, p)
	}
	wg.Wait()

	for _, e := range errs {
		if e != nil {
			return nil, e
		}
	}
	return views, nil
}
