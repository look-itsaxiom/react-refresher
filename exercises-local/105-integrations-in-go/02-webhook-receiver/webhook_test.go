package webhook

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"
)

func newRequest(t *testing.T, secret []byte, ts time.Time, evt Event) *http.Request {
	t.Helper()
	body, err := json.Marshal(evt)
	if err != nil {
		t.Fatalf("marshal event: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/webhooks", bytes.NewReader(body))
	req.Header.Set("X-Timestamp", strconv.FormatInt(ts.Unix(), 10))
	req.Header.Set("X-Signature", Sign(secret, ts, body))
	return req
}

func TestSignAndVerifyRoundTrip(t *testing.T) {
	secret := []byte("s3cret")
	ts := time.Unix(1_700_000_000, 0)
	body := []byte(`{"id":"evt_1"}`)
	sig := Sign(secret, ts, body)

	if err := Verify([][]byte{secret}, ts, body, sig, ts, 5*time.Minute); err != nil {
		t.Fatalf("Verify() = %v, want nil", err)
	}
}

func TestVerifyRejectsWrongSecret(t *testing.T) {
	ts := time.Unix(1_700_000_000, 0)
	body := []byte(`{"id":"evt_1"}`)
	sig := Sign([]byte("right"), ts, body)

	err := Verify([][]byte{[]byte("wrong")}, ts, body, sig, ts, 5*time.Minute)
	if !errors.Is(err, ErrBadSignature) {
		t.Fatalf("Verify() = %v, want ErrBadSignature", err)
	}
}

func TestVerifyAcceptsRotatedSecret(t *testing.T) {
	ts := time.Unix(1_700_000_000, 0)
	body := []byte(`{"id":"evt_1"}`)
	oldSecret := []byte("old")
	newSecret := []byte("new")
	sig := Sign(oldSecret, ts, body) // provider hasn't picked up the new secret yet

	err := Verify([][]byte{newSecret, oldSecret}, ts, body, sig, ts, 5*time.Minute)
	if err != nil {
		t.Fatalf("Verify() with rotated secrets = %v, want nil", err)
	}
}

func TestVerifyRejectsStaleTimestamp(t *testing.T) {
	secret := []byte("s3cret")
	ts := time.Unix(1_700_000_000, 0)
	body := []byte(`{"id":"evt_1"}`)
	sig := Sign(secret, ts, body)

	now := ts.Add(10 * time.Minute)
	err := Verify([][]byte{secret}, ts, body, sig, now, 5*time.Minute)
	if !errors.Is(err, ErrStale) {
		t.Fatalf("Verify() = %v, want ErrStale", err)
	}
}

func TestVerifyRejectsFutureTimestamp(t *testing.T) {
	secret := []byte("s3cret")
	ts := time.Unix(1_700_000_000, 0)
	body := []byte(`{"id":"evt_1"}`)
	sig := Sign(secret, ts, body)

	now := ts.Add(-10 * time.Minute) // ts is implausibly far in the caller's future
	err := Verify([][]byte{secret}, ts, body, sig, now, 5*time.Minute)
	if !errors.Is(err, ErrStale) {
		t.Fatalf("Verify() = %v, want ErrStale", err)
	}
}

func TestHandlerAcceptsValidEvent(t *testing.T) {
	secret := []byte("s3cret")
	now := time.Unix(1_700_000_000, 0)
	store := NewMemStore()
	var processed []string
	process := func(evt Event) error {
		processed = append(processed, evt.ID)
		return nil
	}

	h := Handler([][]byte{secret}, store, func() time.Time { return now }, process)

	req := newRequest(t, secret, now, Event{ID: "evt_1", Type: "ping"})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("status = %d, want %d; body=%s", rec.Code, http.StatusAccepted, rec.Body.String())
	}
	if len(processed) != 1 || processed[0] != "evt_1" {
		t.Fatalf("processed = %v, want [evt_1]", processed)
	}
}

func TestHandlerRejectsBadSignature(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	store := NewMemStore()
	h := Handler([][]byte{[]byte("s3cret")}, store, func() time.Time { return now }, func(Event) error { return nil })

	req := newRequest(t, []byte("wrong-secret"), now, Event{ID: "evt_1"})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestHandlerRejectsStaleTimestamp(t *testing.T) {
	secret := []byte("s3cret")
	now := time.Unix(1_700_000_000, 0)
	store := NewMemStore()
	h := Handler([][]byte{secret}, store, func() time.Time { return now }, func(Event) error { return nil })

	old := now.Add(-10 * time.Minute)
	req := newRequest(t, secret, old, Event{ID: "evt_1"})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestHandlerAcceptsRotatedSecret(t *testing.T) {
	oldSecret := []byte("old")
	newSecret := []byte("new")
	now := time.Unix(1_700_000_000, 0)
	store := NewMemStore()
	h := Handler([][]byte{newSecret, oldSecret}, store, func() time.Time { return now }, func(Event) error { return nil })

	req := newRequest(t, oldSecret, now, Event{ID: "evt_1"})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusAccepted)
	}
}

func TestHandlerSuppressesDuplicates(t *testing.T) {
	secret := []byte("s3cret")
	now := time.Unix(1_700_000_000, 0)
	store := NewMemStore()
	calls := 0
	process := func(Event) error {
		calls++
		return nil
	}
	h := Handler([][]byte{secret}, store, func() time.Time { return now }, process)

	first := newRequest(t, secret, now, Event{ID: "evt_1"})
	h.ServeHTTP(httptest.NewRecorder(), first)

	second := newRequest(t, secret, now, Event{ID: "evt_1"})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, second)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["status"] != "duplicate" {
		t.Fatalf(`status field = %q, want "duplicate"`, body["status"])
	}
	if calls != 1 {
		t.Fatalf("process called %d times, want 1", calls)
	}
}

func TestHandlerRetriesAfterProcessingFailure(t *testing.T) {
	secret := []byte("s3cret")
	now := time.Unix(1_700_000_000, 0)
	store := NewMemStore()
	calls := 0
	process := func(Event) error {
		calls++
		if calls == 1 {
			return errors.New("downstream unavailable")
		}
		return nil
	}
	h := Handler([][]byte{secret}, store, func() time.Time { return now }, process)

	first := newRequest(t, secret, now, Event{ID: "evt_1"})
	rec1 := httptest.NewRecorder()
	h.ServeHTTP(rec1, first)
	if rec1.Code != http.StatusInternalServerError {
		t.Fatalf("first status = %d, want %d", rec1.Code, http.StatusInternalServerError)
	}

	retry := newRequest(t, secret, now, Event{ID: "evt_1"})
	rec2 := httptest.NewRecorder()
	h.ServeHTTP(rec2, retry)
	if rec2.Code != http.StatusAccepted {
		t.Fatalf("retry status = %d, want %d", rec2.Code, http.StatusAccepted)
	}
	if calls != 2 {
		t.Fatalf("process called %d times, want 2", calls)
	}
}

func TestHandlerRejectsMalformedTimestamp(t *testing.T) {
	secret := []byte("s3cret")
	now := time.Unix(1_700_000_000, 0)
	store := NewMemStore()
	h := Handler([][]byte{secret}, store, func() time.Time { return now }, func(Event) error { return nil })

	body := []byte(`{"id":"evt_1"}`)
	req := httptest.NewRequest(http.MethodPost, "/webhooks", bytes.NewReader(body))
	req.Header.Set("X-Timestamp", "not-a-number")
	req.Header.Set("X-Signature", Sign(secret, now, body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}
