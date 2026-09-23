//go:build solution

package fetchall

import (
	"fmt"
	"sync"
)

type Result struct {
	ID    string
	Value int
}

func FetchAll(ids []string, fetch func(id string) (int, error), maxConcurrent int) ([]Result, error) {
	if maxConcurrent < 1 {
		maxConcurrent = 1
	}

	results := make([]Result, len(ids))
	sem := make(chan struct{}, maxConcurrent)

	var (
		wg       sync.WaitGroup
		mu       sync.Mutex
		firstErr error
		stopped  bool
	)

	for i, id := range ids {
		wg.Go(func() {
			sem <- struct{}{}
			defer func() { <-sem }()

			mu.Lock()
			skip := stopped
			mu.Unlock()
			if skip {
				return
			}

			value, err := fetch(id)

			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				if firstErr == nil {
					firstErr = fmt.Errorf("fetching %q: %w", id, err)
				}
				stopped = true
				return
			}
			results[i] = Result{ID: id, Value: value}
		})
	}
	wg.Wait()

	if firstErr != nil {
		return nil, firstErr
	}
	return results, nil
}

// Counter is a count that many goroutines can increment at once.
type Counter struct {
	mu  sync.Mutex
	val int
}

func (c *Counter) Inc() {
	c.mu.Lock()
	c.val++
	c.mu.Unlock()
}

func (c *Counter) Value() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.val
}
