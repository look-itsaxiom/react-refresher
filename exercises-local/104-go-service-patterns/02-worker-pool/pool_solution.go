//go:build solution

package pool

import (
	"context"
	"sync"
)

// Job is one unit of work submitted to the pool.
type Job struct {
	ID   string
	Cost int
}

// Result is what a Job produced (or the error it failed with).
type Result struct {
	ID  string
	Out int
	Err error
}

// Run processes jobs with exactly `workers` goroutines, preserves input order in the
// returned slice, and stops scheduling new jobs (without cutting off ones already in
// flight) once ctx is cancelled.
func Run(ctx context.Context, jobs []Job, workers int, fn func(context.Context, Job) (int, error)) ([]Result, error) {
	results := make([]Result, len(jobs))
	indices := make(chan int)

	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for idx := range indices {
				j := jobs[idx]
				out, err := fn(ctx, j)
				results[idx] = Result{ID: j.ID, Out: out, Err: err}
			}
		}()
	}

	var scheduleErr error
feed:
	for idx := range jobs {
		select {
		case <-ctx.Done():
			scheduleErr = ctx.Err()
			break feed
		case indices <- idx:
		}
	}
	close(indices)

	// Every worker exits its range loop once indices is closed and drained; wg.Wait
	// blocks until that has happened for all of them, so no goroutine outlives Run.
	wg.Wait()

	return results, scheduleErr
}
