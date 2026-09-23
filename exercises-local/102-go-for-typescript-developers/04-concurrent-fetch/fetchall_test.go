package fetchall

import (
	"errors"
	"sync"
	"testing"
	"time"
)

func TestFetchAllOrder(t *testing.T) {
	ids := []string{"a", "b", "c", "d", "e"}
	fetch := func(id string) (int, error) {
		return len(id), nil
	}
	got, err := FetchAll(ids, fetch, 2)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != len(ids) {
		t.Fatalf("got %d results, want %d", len(got), len(ids))
	}
	for i, id := range ids {
		if got[i].ID != id {
			t.Fatalf("result[%d].ID = %q, want %q (results must stay in input order)", i, got[i].ID, id)
		}
	}
}

func TestFetchAllConcurrency(t *testing.T) {
	ids := make([]string, 10)
	for i := range ids {
		ids[i] = string(rune('a' + i))
	}
	fetch := func(id string) (int, error) {
		time.Sleep(30 * time.Millisecond)
		return 1, nil
	}

	start := time.Now()
	if _, err := FetchAll(ids, fetch, 5); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	elapsed := time.Since(start)
	if elapsed >= 200*time.Millisecond {
		t.Fatalf("FetchAll took %v for 10 fetches of 30ms at maxConcurrent 5, want well under 200ms "+
			"(a sequential implementation takes ~300ms)", elapsed)
	}
}

func TestFetchAllRespectsMaxConcurrent(t *testing.T) {
	ids := make([]string, 12)
	for i := range ids {
		ids[i] = string(rune('a' + i))
	}

	var mu sync.Mutex
	inFlight, peak := 0, 0
	fetch := func(id string) (int, error) {
		mu.Lock()
		inFlight++
		if inFlight > peak {
			peak = inFlight
		}
		mu.Unlock()

		time.Sleep(15 * time.Millisecond)

		mu.Lock()
		inFlight--
		mu.Unlock()
		return 1, nil
	}

	const maxConcurrent = 3
	if _, err := FetchAll(ids, fetch, maxConcurrent); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	mu.Lock()
	got := peak
	mu.Unlock()
	if got > maxConcurrent {
		t.Fatalf("peak in-flight fetches = %d, want <= %d", got, maxConcurrent)
	}
}

var errBoom = errors.New("boom")

func TestFetchAllFirstError(t *testing.T) {
	ids := []string{"a", "b", "c"}
	fetch := func(id string) (int, error) {
		if id == "b" {
			return 0, errBoom
		}
		return 1, nil
	}
	_, err := FetchAll(ids, fetch, 1)
	if err == nil {
		t.Fatal("FetchAll() succeeded, want an error")
	}
	if !errors.Is(err, errBoom) {
		t.Fatalf("FetchAll() error = %v, want it to wrap errBoom", err)
	}
}

func TestCounter(t *testing.T) {
	var c Counter
	var wg sync.WaitGroup
	const goroutines, incsEach = 100, 100
	for i := 0; i < goroutines; i++ {
		wg.Go(func() {
			for j := 0; j < incsEach; j++ {
				c.Inc()
			}
		})
	}
	wg.Wait()

	if got, want := c.Value(), goroutines*incsEach; got != want {
		t.Fatalf("Counter.Value() = %d, want %d", got, want)
	}
}
