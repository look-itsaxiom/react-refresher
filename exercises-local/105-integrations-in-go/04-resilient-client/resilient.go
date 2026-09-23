//go:build !solution

package resilient

import (
	"context"
	"fmt"
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
	Rand func() float64 // returns a value in [0, 1)
}

// Delay returns the wait before retry attempt (0-indexed).
//
// TODO: this doubles the base delay every attempt with no jitter and no
// cap. Every caller retrying the same failure waits the exact same amount
// of time (a thundering herd against the recovering service), and after
// enough attempts the delay grows past anything reasonable.
func (b Backoff) Delay(attempt int) time.Duration {
	d := b.Base
	for i := 0; i < attempt; i++ {
		d *= 2
	}
	return d
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

// Do sends req, retrying on failure per opts.
//
// TODO: this retries every method, including a bare POST with no
// Idempotency-Key -- if the first attempt's response was lost but the
// server actually processed it, a naive retry double-charges the caller.
// It also ignores any Retry-After header entirely and always waits the
// locally computed backoff, even when the server told it exactly how long
// to wait.
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

	var lastResp *http.Response
	var lastErr error

	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 && req.GetBody != nil {
			body, err := req.GetBody()
			if err == nil {
				req.Body = body
			}
		}

		resp, err := client.Do(req.WithContext(ctx))
		lastResp, lastErr = resp, err

		shouldRetry := retryOn(resp, err) && attempt < maxAttempts-1
		if !shouldRetry {
			if err != nil {
				return nil, &RetryError{Attempts: attempt + 1, Err: err}
			}
			return resp, nil
		}

		if resp != nil {
			resp.Body.Close()
		}

		if serr := sleep(ctx, opts.Backoff.Delay(attempt)); serr != nil {
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
	mu     sync.Mutex
	tokens float64
}

// NewTokenBucket creates a bucket that refills at rate tokens/second up to
// a capacity of burst, using now for the clock (inject a fake one in tests).
//
// TODO: rate and now are never stored, so the bucket starts with burst
// tokens but they are never replenished -- once they're spent, Allow/Take
// are false forever, instead of gradually coming back at rate/sec.
func NewTokenBucket(rate float64, burst int, now func() time.Time) *TokenBucket {
	return &TokenBucket{tokens: float64(burst)}
}

// Allow is shorthand for Take(1).
func (b *TokenBucket) Allow() bool {
	return b.Take(1)
}

// Take reports whether n tokens are available and, if so, consumes them.
func (b *TokenBucket) Take(n int) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.tokens >= float64(n) {
		b.tokens -= float64(n)
		return true
	}
	return false
}
