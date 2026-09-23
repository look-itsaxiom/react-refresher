//go:build !solution

package pool

import "context"

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

// Run processes jobs and returns one Result per job, in the same order as jobs.
//
// TODO:
//   - Process jobs with exactly `workers` goroutines instead of one at a time.
//   - Keep results in input order regardless of which goroutine finishes first.
//   - Stop scheduling new jobs once ctx is cancelled, and return ctx.Err(); results
//     already produced by jobs that had already started stay in the returned slice.
//   - Never let a goroutine outlive Run: every worker must exit before Run returns.
//   - A per-job error from fn belongs in that Result's Err field. It must not stop the
//     pool from processing the remaining jobs.
func Run(ctx context.Context, jobs []Job, workers int, fn func(context.Context, Job) (int, error)) ([]Result, error) {
	results := make([]Result, 0, len(jobs))
	for _, j := range jobs {
		out, err := fn(ctx, j)
		results = append(results, Result{ID: j.ID, Out: out, Err: err})
	}
	return results, nil
}
