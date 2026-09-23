package resilient

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestBackoffDelayFullJitter(t *testing.T) {
	b := Backoff{Base: 100 * time.Millisecond, Max: 10 * time.Second, Rand: func() float64 { return 0.5 }}

	// attempt 0: base*2^0 = 100ms, capped well under Max -> 0.5 * 100ms
	if got, want := b.Delay(0), 50*time.Millisecond; got != want {
		t.Fatalf("Delay(0) = %v, want %v", got, want)
	}
	// attempt 3: base*2^3 = 800ms -> 0.5 * 800ms
	if got, want := b.Delay(3), 400*time.Millisecond; got != want {
		t.Fatalf("Delay(3) = %v, want %v", got, want)
	}
}

func TestBackoffDelayRespectsMax(t *testing.T) {
	b := Backoff{Base: 100 * time.Millisecond, Max: 2 * time.Second, Rand: func() float64 { return 1 }}

	// attempt 10: base*2^10 is huge, must be capped at Max before jitter.
	if got, want := b.Delay(10), 2*time.Second; got != want {
		t.Fatalf("Delay(10) = %v, want %v (capped at Max)", got, want)
	}
}

func TestParseRetryAfterSeconds(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	d, ok := ParseRetryAfter("120", now)
	if !ok || d != 120*time.Second {
		t.Fatalf("ParseRetryAfter(120) = (%v, %v), want (120s, true)", d, ok)
	}
}

func TestParseRetryAfterHTTPDate(t *testing.T) {
	now := time.Date(2026, 9, 23, 12, 0, 0, 0, time.UTC)
	future := now.Add(90 * time.Second)
	d, ok := ParseRetryAfter(future.UTC().Format(http.TimeFormat), now)
	if !ok {
		t.Fatalf("ParseRetryAfter(HTTP-date) ok = false, want true")
	}
	if d < 89*time.Second || d > 91*time.Second {
		t.Fatalf("ParseRetryAfter(HTTP-date) = %v, want ~90s", d)
	}
}

func TestParseRetryAfterInvalid(t *testing.T) {
	if _, ok := ParseRetryAfter("not-a-value", time.Now()); ok {
		t.Fatalf("ParseRetryAfter(garbage) ok = true, want false")
	}
}

func TestDoRetriesOnServiceUnavailable(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt32(&calls, 1)
		if n < 3 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	var slept []time.Duration
	sleep := func(_ context.Context, d time.Duration) error {
		slept = append(slept, d)
		return nil
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}

	resp, err := Do(context.Background(), srv.Client(), req, Options{
		MaxAttempts: 5,
		Backoff:     Backoff{Base: time.Millisecond, Max: 10 * time.Millisecond, Rand: func() float64 { return 0 }},
		Sleep:       sleep,
	})
	if err != nil {
		t.Fatalf("Do() error = %v, want nil", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusOK)
	}
	if calls != 3 {
		t.Fatalf("server called %d times, want 3", calls)
	}
	if len(slept) != 2 {
		t.Fatalf("slept %d times, want 2", len(slept))
	}
}

func TestDoHonorsRetryAfterOn429(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt32(&calls, 1)
		if n == 1 {
			w.Header().Set("Retry-After", "2")
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	var slept []time.Duration
	sleep := func(_ context.Context, d time.Duration) error {
		slept = append(slept, d)
		return nil
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}

	// A backoff that, if used instead of Retry-After, would sleep 10ms --
	// nowhere near 2s, so the assertion below only passes if Retry-After won.
	resp, err := Do(context.Background(), srv.Client(), req, Options{
		MaxAttempts: 3,
		Backoff:     Backoff{Base: 10 * time.Millisecond, Max: 10 * time.Millisecond, Rand: func() float64 { return 1 }},
		Sleep:       sleep,
		Now:         func() time.Time { return time.Unix(0, 0) },
	})
	if err != nil {
		t.Fatalf("Do() error = %v, want nil", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusOK)
	}
	if len(slept) != 1 || slept[0] != 2*time.Second {
		t.Fatalf("slept = %v, want [2s]", slept)
	}
}

func TestDoDoesNotRetryPostWithoutIdempotencyKey(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}

	resp, err := Do(context.Background(), srv.Client(), req, Options{
		MaxAttempts: 5,
		Backoff:     Backoff{Base: time.Millisecond, Max: time.Millisecond, Rand: func() float64 { return 0 }},
		Sleep:       func(context.Context, time.Duration) error { return nil },
	})
	if err != nil {
		t.Fatalf("Do() error = %v, want nil", err)
	}
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusServiceUnavailable)
	}
	if calls != 1 {
		t.Fatalf("server called %d times, want 1 (no retry without Idempotency-Key)", calls)
	}
}

func TestDoRetriesPostWithIdempotencyKey(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt32(&calls, 1)
		if n < 2 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Idempotency-Key", "key-123")

	resp, err := Do(context.Background(), srv.Client(), req, Options{
		MaxAttempts: 5,
		Backoff:     Backoff{Base: time.Millisecond, Max: time.Millisecond, Rand: func() float64 { return 0 }},
		Sleep:       func(context.Context, time.Duration) error { return nil },
	})
	if err != nil {
		t.Fatalf("Do() error = %v, want nil", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusOK)
	}
	if calls != 2 {
		t.Fatalf("server called %d times, want 2 (retried with Idempotency-Key)", calls)
	}
}

func TestDoStopsOnContextCancellation(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	ctx, cancel := context.WithCancel(context.Background())
	sleepCalls := 0
	sleep := func(ctx context.Context, d time.Duration) error {
		sleepCalls++
		cancel() // caller gives up mid-retry
		return ctx.Err()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}

	_, doErr := Do(ctx, srv.Client(), req, Options{
		MaxAttempts: 5,
		Backoff:     Backoff{Base: time.Millisecond, Max: time.Millisecond, Rand: func() float64 { return 0 }},
		Sleep:       sleep,
	})

	var rerr *RetryError
	if !errors.As(doErr, &rerr) {
		t.Fatalf("err = %v, want *RetryError", doErr)
	}
	if !errors.Is(rerr.Err, context.Canceled) {
		t.Fatalf("underlying err = %v, want context.Canceled", rerr.Err)
	}
	if calls != 1 {
		t.Fatalf("server called %d times, want 1", calls)
	}
	if sleepCalls != 1 {
		t.Fatalf("sleep called %d times, want 1", sleepCalls)
	}
}

func TestTokenBucketBurstAndRefill(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	clock := func() time.Time { return now }
	b := NewTokenBucket(1 /* per second */, 3 /* burst */, clock)

	if !b.Take(3) {
		t.Fatalf("Take(3) at full burst = false, want true")
	}
	if b.Allow() {
		t.Fatalf("Allow() immediately after exhausting burst = true, want false")
	}

	now = now.Add(2 * time.Second) // 1 token/sec * 2s = 2 tokens refilled
	if !b.Take(2) {
		t.Fatalf("Take(2) after 2s at 1/s = false, want true")
	}
	if b.Allow() {
		t.Fatalf("Allow() after taking the refilled tokens = true, want false")
	}

	now = now.Add(100 * time.Second) // far more than burst worth of refill
	if !b.Take(3) {
		t.Fatalf("Take(3) after long idle = false, want true (capped at burst)")
	}
	if b.Take(1) {
		t.Fatalf("Take(1) beyond burst cap = true, want false")
	}
}
