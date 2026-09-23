//go:build !solution

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

// Verify checks sig against body signed with one of secrets, within
// tolerance of now.
//
// TODO: this only checks the FIRST secret (breaks rotation -- a request
// signed with the old secret during a rotation window is rejected),
// compares with == (not constant-time, a timing side channel), and never
// looks at tolerance at all (a captured, validly-signed request can be
// replayed hours later and still succeeds).
func Verify(secrets [][]byte, ts time.Time, body []byte, sig string, now time.Time, tolerance time.Duration) error {
	want := Sign(secrets[0], ts, body)
	if want != sig {
		return ErrBadSignature
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

// Handler verifies, deduplicates, and processes incoming webhook events.
//
// TODO: this marks the event processed BEFORE calling process, and never
// checks Store.Processed at all -- every delivery, including retries the
// provider sends because it never saw your 2xx, re-runs process. Worse, if
// process fails after the mark, the event is now permanently "processed"
// and a legitimate retry gets silently dropped.
func Handler(secrets [][]byte, store Store, now func() time.Time, process func(Event) error) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "cannot read body", http.StatusBadRequest)
			return
		}

		tsUnix, err := strconv.ParseInt(r.Header.Get("X-Timestamp"), 10, 64)
		if err != nil {
			http.Error(w, "malformed timestamp", http.StatusBadRequest)
			return
		}
		ts := time.Unix(tsUnix, 0)
		sig := r.Header.Get("X-Signature")

		if err := Verify(secrets, ts, body, sig, now(), 5*time.Minute); err != nil {
			http.Error(w, "bad signature", http.StatusUnauthorized)
			return
		}

		var evt Event
		if err := json.Unmarshal(body, &evt); err != nil || evt.ID == "" {
			http.Error(w, "malformed event", http.StatusBadRequest)
			return
		}

		store.MarkProcessed(evt.ID)

		if err := process(evt); err != nil {
			http.Error(w, "processing failed", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "accepted"})
	})
}
