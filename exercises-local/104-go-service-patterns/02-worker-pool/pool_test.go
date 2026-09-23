package pool

import (
	"context"
	"errors"
	"fmt"
	"runtime"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestRunPreservesOrder(t *testing.T) {
	const n = 12
	jobs := make([]Job, n)
	for i := range jobs {
		jobs[i] = Job{ID: fmt.Sprintf("job-%d", i), Cost: i}
	}
	// Later jobs finish first, so an implementation that appends results in
	// completion order (instead of writing to the right index) fails this.
	fn := func(_ context.Context, j Job) (int, error) {
		time.Sleep(time.Duration(n-j.Cost) * time.Millisecond)
		return j.Cost * 2, nil
	}

	results, err := Run(context.Background(), jobs, 4, fn)
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}
	if len(results) != n {
		t.Fatalf("got %d results, want %d", len(results), n)
	}
	for i, r := range results {
		if r.ID != jobs[i].ID {
			t.Fatalf("results[%d].ID = %q, want %q", i, r.ID, jobs[i].ID)
		}
		if r.Out != jobs[i].Cost*2 {
			t.Fatalf("results[%d].Out = %d, want %d", i, r.Out, jobs[i].Cost*2)
		}
	}
}

func TestRunConcurrencyMatchesWorkers(t *testing.T) {
	const workers = 3
	jobs := make([]Job, workers*3)
	for i := range jobs {
		jobs[i] = Job{ID: fmt.Sprintf("job-%d", i), Cost: 1}
	}

	var mu sync.Mutex
	current, peak := 0, 0
	fn := func(_ context.Context, j Job) (int, error) {
		mu.Lock()
		current++
		if current > peak {
			peak = current
		}
		mu.Unlock()

		time.Sleep(20 * time.Millisecond)

		mu.Lock()
		current--
		mu.Unlock()
		return j.Cost, nil
	}

	results, err := Run(context.Background(), jobs, workers, fn)
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}
	if len(results) != len(jobs) {
		t.Fatalf("got %d results, want %d", len(results), len(jobs))
	}
	if peak != workers {
		t.Fatalf("peak concurrency = %d, want exactly %d", peak, workers)
	}
}

func TestRunCancellationReturnsPartialResultsWithoutLeak(t *testing.T) {
	before := runtime.NumGoroutine()

	const workers = 2
	jobs := make([]Job, 20)
	for i := range jobs {
		jobs[i] = Job{ID: fmt.Sprintf("job-%d", i), Cost: i}
	}

	ctx, cancel := context.WithCancel(context.Background())
	var started int32
	fn := func(_ context.Context, j Job) (int, error) {
		atomic.AddInt32(&started, 1)
		time.Sleep(25 * time.Millisecond)
		return j.Cost * 2, nil
	}

	go func() {
		time.Sleep(40 * time.Millisecond)
		cancel()
	}()

	results, err := Run(ctx, jobs, workers, fn)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("Run error = %v, want context.Canceled", err)
	}
	if len(results) != len(jobs) {
		t.Fatalf("got %d results, want %d (every index keeps a slot)", len(results), len(jobs))
	}

	completed := 0
	for i, r := range results {
		if r.ID == "" {
			continue
		}
		completed++
		if r.Err != nil {
			t.Fatalf("result %d: unexpected error %v", i, r.Err)
		}
		if r.Out != jobs[i].Cost*2 {
			t.Fatalf("result %d: Out = %d, want %d", i, r.Out, jobs[i].Cost*2)
		}
	}
	if completed == 0 || completed == len(jobs) {
		t.Fatalf("expected a partial run (some jobs never scheduled), completed %d of %d", completed, len(jobs))
	}
	if int(atomic.LoadInt32(&started)) < workers {
		t.Fatalf("expected at least %d jobs to have started before cancellation, got %d", workers, started)
	}

	time.Sleep(30 * time.Millisecond) // let worker goroutines finish unwinding
	after := runtime.NumGoroutine()
	if after > before+2 {
		t.Fatalf("goroutine leak: NumGoroutine before=%d after=%d", before, after)
	}
}

func TestRunPerJobErrorsDoNotStopPool(t *testing.T) {
	jobs := []Job{{ID: "a", Cost: 1}, {ID: "b", Cost: 2}, {ID: "c", Cost: 3}}
	boom := errors.New("boom")
	fn := func(_ context.Context, j Job) (int, error) {
		if j.ID == "b" {
			return 0, boom
		}
		return j.Cost * 10, nil
	}

	results, err := Run(context.Background(), jobs, 2, fn)
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("got %d results, want 3", len(results))
	}
	if results[0].Err != nil || results[0].Out != 10 {
		t.Fatalf("result[0] = %+v, want Out=10 Err=nil", results[0])
	}
	if !errors.Is(results[1].Err, boom) {
		t.Fatalf("result[1].Err = %v, want boom", results[1].Err)
	}
	if results[2].Err != nil || results[2].Out != 30 {
		t.Fatalf("result[2] = %+v, want Out=30 Err=nil", results[2])
	}
}
