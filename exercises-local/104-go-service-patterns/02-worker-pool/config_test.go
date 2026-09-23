package pool

import (
	"errors"
	"log/slog"
	"strings"
	"testing"
)

func TestLoadConfigDefaultsAndOverrides(t *testing.T) {
	empty := func(string) string { return "" }
	cfg, err := LoadConfig(empty)
	if err != nil {
		t.Fatalf("LoadConfig(empty) error = %v", err)
	}
	want := Config{Port: 8080, Workers: 4, LogLevel: slog.LevelInfo}
	if cfg != want {
		t.Fatalf("LoadConfig(empty) = %+v, want %+v", cfg, want)
	}

	env := map[string]string{"PORT": "9090", "WORKERS": "10", "LOG_LEVEL": "warn"}
	getenv := func(k string) string { return env[k] }
	cfg, err = LoadConfig(getenv)
	if err != nil {
		t.Fatalf("LoadConfig(overrides) error = %v", err)
	}
	want = Config{Port: 9090, Workers: 10, LogLevel: slog.LevelWarn}
	if cfg != want {
		t.Fatalf("LoadConfig(overrides) = %+v, want %+v", cfg, want)
	}
}

func TestLoadConfigValidationErrorsJoinSentinel(t *testing.T) {
	env := map[string]string{"PORT": "0", "WORKERS": "100"}
	getenv := func(k string) string { return env[k] }

	_, err := LoadConfig(getenv)
	if err == nil {
		t.Fatal("LoadConfig with out-of-range Port and Workers: want error, got nil")
	}
	if !errors.Is(err, ErrInvalidConfig) {
		t.Fatalf("errors.Is(err, ErrInvalidConfig) = false, err: %v", err)
	}
	msg := err.Error()
	if !strings.Contains(msg, "Workers") {
		t.Fatalf("error message %q does not mention Workers", msg)
	}
	if !strings.Contains(msg, "Port") {
		t.Fatalf("error message %q does not mention Port", msg)
	}
}
