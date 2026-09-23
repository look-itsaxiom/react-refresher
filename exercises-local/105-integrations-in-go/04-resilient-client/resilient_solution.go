//go:build solution

package resilient

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Backoff computes retry delays.
type Backoff struct {
	Base time.Duration
	Max  time.Duration
	Rand func() float64 // returns a value in [0, 1); defaults to rand.Float64
}

// Delay returns the wait before retry attempt (0-indexed), using full
// jitter: a value uniformly random in [0, min(Max, Base*2^attempt)]. See
// AWS's "Exponential Backoff And Jitter" -- full jitter spreads retries out
// instead of every caller waiting (and retrying) at the same instant.
func (b Backoff) Delay(attempt int) time.Duration {
	if attempt < 0 {
		attempt = 0
	}
	cap := b.Max
	d := b.Base
	for i := 0; i < attempt; i++ {
		next := d * 2
		if next < d || (cap > 0 && next > cap) { // overflow or past the cap
			d = cap
			break
		}
		d = next
	}
	if cap > 0 && d > cap {
		d = cap
	}

	r := b.Rand
	if r == nil {
		r = rand.Float64
	}
	return time.Duration(r() * float64(d))
}

// ParseRetryAfter parses a Retry-After header value, either delta-seconds
// ("120") or an HTTP-date, relative to now.
func ParseRetryAfter(h string, now time.Time) (time.Duration, bool) {
	h = strings.TrimSpace(h)
	if h == "" {
		return 0, false
	}
	if secs, err := strconv.Atoi(h); err == nil {
		if secs < 0 {
			return 0, false
		}
		return time.Duration(secs) * time.Second, true
	}
	if when, err := http.ParseTime(h); err == nil {
		d := when.Sub(now)
		if d < 0 {
			d = 0
		}
		return d, true
	}
	return 0, false
}

// Options configures Do.
type Options struct {
	MaxAttempts int
	Backoff     Backoff
	// Sleep waits d, respecting ctx cancellation. Defaults to a real timer.
	Sleep func(ctx context.Context, d time.Duration) error
	// Now returns the current time, used to resolve an HTTP-date Retry-After.
	Now func() time.Time
	// RetryOn decides whether (resp, err) should be retried. Defaults to
	// retrying network errors and 429/503 responses.
	RetryOn func(resp *http.Response, err error) bool
}

// RetryError is returned when Do gives up. Attempts is the number of
// requests actually sent.
type RetryError struct {
	Attempts int
	Err      error
}

func (e *RetryError) Error() string {
	return fmt.Sprintf("resilient: giving up after %d attempt(s): %v", e.Attempts, e.Err)
}

func (e *RetryError) Unwrap() error { return e.Err }

func defaultRetryOn(resp *http.Response, err error) bool {
	if err != nil {
		return true
	}
	return resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == http.StatusServiceUnavailable
}

func defaultSleep(ctx context.Context, d time.Duration) error {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-t.C:
		return nil
	}
}

// isIdempotent reports whether req may be safely retried: GET/HEAD/PUT/
// DELETE/OPTIONS are idempotent by definition, and anything else (POST,
// PATCH) is only safe if the caller attached an Idempotency-Key.
func isIdempotent(req *http.Request) bool {
	switch req.Method {
	case http.MethodGet, http.MethodHead, http.MethodPut, http.MethodDelete, http.MethodOptions, http.MethodTrace:
		return true
	default:
		return req.Header.Get("Idempotency-Key") != ""
	}
}

// Do sends req, retrying on failure per opts. It never retries a
// non-idempotent request unless it carries an Idempotency-Key, honors a
// Retry-After response header over the computed backoff, re-sends the body
// via req.GetBody on each retry, and stops as soon as ctx is done. On
// final failure it returns a *RetryError (unwrap with errors.As) carrying
// the number of attempts actually made.
func Do(ctx context.Context, client *http.Client, req *http.Request, opts Options) (*http.Response, error) {
	maxAttempts := opts.MaxAttempts
	if maxAttempts <= 0 {
		maxAttempts = 1
	}
	retryOn := opts.RetryOn
	if retryOn == nil {
		retryOn = defaultRetryOn
	}
	sleep := opts.Sleep
	if sleep == nil {
		sleep = defaultSleep
	}
	now := opts.Now
	if now == nil {
		now = time.Now
	}
	canRetry := isIdempotent(req)

	var lastResp *http.Response
	var lastErr error

	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 {
			if req.GetBody != nil {
				body, err := req.GetBody()
				if err != nil {
					return nil, &RetryError{Attempts: attempt, Err: err}
				}
				req.Body = body
			}
		}

		resp, err := client.Do(req.WithContext(ctx))
		lastResp, lastErr = resp, err

		if ctx.Err() != nil {
			if resp != nil {
				resp.Body.Close()
			}
			return nil, &RetryError{Attempts: attempt + 1, Err: ctx.Err()}
		}

		shouldRetry := retryOn(resp, err) && canRetry && attempt < maxAttempts-1
		if !shouldRetry {
			if err != nil {
				return nil, &RetryError{Attempts: attempt + 1, Err: err}
			}
			return resp, nil
		}

		delay := opts.Backoff.Delay(attempt)
		if resp != nil {
			if ra := resp.Header.Get("Retry-After"); ra != "" {
				if d, ok := ParseRetryAfter(ra, now()); ok {
					delay = d
				}
			}
			resp.Body.Close()
		}

		if serr := sleep(ctx, delay); serr != nil {
			return nil, &RetryError{Attempts: attempt + 1, Err: serr}
		}
	}

	if lastErr != nil {
		return nil, &RetryError{Attempts: maxAttempts, Err: lastErr}
	}
	return lastResp, nil
}

// TokenBucket is a continuously-refilling token bucket rate limiter.
type TokenBucket struct {
	mu       sync.Mutex
	rate     float64
	burst    float64
	tokens   float64
	now      func() time.Time
	lastFill time.Time
}

// NewTokenBucket creates a bucket that refills at rate tokens/second up to
// a capacity of burst, starting full. now supplies the clock (inject a
// fake one in tests so refill is deterministic).
func NewTokenBucket(rate float64, burst int, now func() time.Time) *TokenBucket {
	if now == nil {
		now = time.Now
	}
	return &TokenBucket{
		rate:     rate,
		burst:    float64(burst),
		tokens:   float64(burst),
		now:      now,
		lastFill: now(),
	}
}

func (b *TokenBucket) refillLocked() {
	n := b.now()
	elapsed := n.Sub(b.lastFill).Seconds()
	if elapsed <= 0 {
		return
	}
	b.tokens += elapsed * b.rate
	if b.tokens > b.burst {
		b.tokens = b.burst
	}
	b.lastFill = n
}

// Allow is shorthand for Take(1).
func (b *TokenBucket) Allow() bool {
	return b.Take(1)
}

// Take reports whether n tokens are available and, if so, consumes them.
func (b *TokenBucket) Take(n int) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.refillLocked()
	if b.tokens >= float64(n) {
		b.tokens -= float64(n)
		return true
	}
	return false
}
