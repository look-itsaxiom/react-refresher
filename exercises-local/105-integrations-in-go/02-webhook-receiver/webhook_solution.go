//go:build solution

package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"sync"
	"time"
)

var (
	// ErrBadSignature means sig did not match any of the provided secrets.
	ErrBadSignature = errors.New("webhook: bad signature")
	// ErrStale means the timestamp fell outside the tolerance window.
	ErrStale = errors.New("webhook: stale timestamp")
)

const maxBodyBytes = 1 << 20 // 1 MiB

// Event is the JSON body a provider POSTs to the webhook endpoint.
type Event struct {
	ID   string          `json:"id"`
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// Sign returns the hex-encoded HMAC-SHA256 of "<unix-timestamp>.<body>".
func Sign(secret []byte, ts time.Time, body []byte) string {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(strconv.FormatInt(ts.Unix(), 10)))
	mac.Write([]byte("."))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

// Verify checks sig against body signed with any of secrets (so a secret
// rotation can accept both the old and new secret for a window), enforcing
// a tolerance window around now to defeat replay of an old, captured
// request. The comparison is constant-time via hmac.Equal.
func Verify(secrets [][]byte, ts time.Time, body []byte, sig string, now time.Time, tolerance time.Duration) error {
	sigBytes, err := hex.DecodeString(sig)
	if err != nil || len(sigBytes) == 0 {
		return ErrBadSignature
	}

	valid := false
	for _, secret := range secrets {
		wantBytes, err := hex.DecodeString(Sign(secret, ts, body))
		if err != nil {
			continue
		}
		if hmac.Equal(wantBytes, sigBytes) {
			valid = true
			break
		}
	}
	if !valid {
		return ErrBadSignature
	}

	delta := now.Sub(ts)
	if delta < 0 {
		delta = -delta
	}
	if delta > tolerance {
		return ErrStale
	}
	return nil
}

// Store records which webhook event ids have already been processed.
type Store interface {
	// Processed reports whether id has already been marked processed.
	Processed(id string) (bool, error)
	// MarkProcessed marks id as processed. first reports whether this call
	// is the one that marked it (false if it was already marked).
	MarkProcessed(id string) (first bool, err error)
}

// MemStore is an in-memory Store. Good enough for tests and small services;
// a real one is a row in Postgres with a unique constraint on id (lesson 106).
type MemStore struct {
	mu   sync.Mutex
	done map[string]bool
}

func NewMemStore() *MemStore {
	return &MemStore{done: make(map[string]bool)}
}

func (s *MemStore) Processed(id string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.done[id], nil
}

func (s *MemStore) MarkProcessed(id string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.done[id] {
		return false, nil
	}
	s.done[id] = true
	return true, nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Handler verifies, deduplicates, and processes incoming webhook events.
//
// The body is read once, capped at 1 MiB, before anything else. Duplicate
// ids short-circuit to a 200 without calling process (at-least-once
// delivery means the provider will redeliver anything it didn't get a 2xx
// for). process only runs for new ids, and the id is only marked processed
// AFTER process succeeds, so a failed attempt (500) leaves the id
// unmarked and a provider retry runs process again.
func Handler(secrets [][]byte, store Store, now func() time.Time, process func(Event) error) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tsHeader := r.Header.Get("X-Timestamp")
		sig := r.Header.Get("X-Signature")

		r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "body too large or unreadable", http.StatusBadRequest)
			return
		}

		tsUnix, err := strconv.ParseInt(tsHeader, 10, 64)
		if err != nil {
			http.Error(w, "malformed timestamp", http.StatusBadRequest)
			return
		}
		ts := time.Unix(tsUnix, 0)

		switch verr := Verify(secrets, ts, body, sig, now(), 5*time.Minute); {
		case errors.Is(verr, ErrBadSignature):
			http.Error(w, "bad signature", http.StatusUnauthorized)
			return
		case errors.Is(verr, ErrStale):
			http.Error(w, "stale timestamp", http.StatusBadRequest)
			return
		case verr != nil:
			http.Error(w, "verification failed", http.StatusBadRequest)
			return
		}

		var evt Event
		if err := json.Unmarshal(body, &evt); err != nil || evt.ID == "" {
			http.Error(w, "malformed event", http.StatusBadRequest)
			return
		}

		done, err := store.Processed(evt.ID)
		if err != nil {
			http.Error(w, "store error", http.StatusInternalServerError)
			return
		}
		if done {
			writeJSON(w, http.StatusOK, map[string]string{"status": "duplicate"})
			return
		}

		if err := process(evt); err != nil {
			http.Error(w, "processing failed", http.StatusInternalServerError)
			return
		}

		if _, err := store.MarkProcessed(evt.ID); err != nil {
			http.Error(w, "store error", http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
	})
}
