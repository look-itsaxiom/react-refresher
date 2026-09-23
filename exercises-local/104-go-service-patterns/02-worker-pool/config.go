//go:build !solution

package pool

import (
	"errors"
	"log/slog"
	"strconv"
)

// Config is what a service reads at startup.
type Config struct {
	Port     int
	Workers  int
	LogLevel slog.Level
}

// ErrInvalidConfig is wrapped into every validation failure LoadConfig reports, so
// callers can test for "was this a config problem" with errors.Is.
var ErrInvalidConfig = errors.New("invalid config")

// LoadConfig reads PORT, WORKERS, and LOG_LEVEL through getenv (so tests can supply a
// fake instead of the real environment), defaulting to Port 8080, Workers 4, and
// LogLevel info when a variable is unset.
//
// TODO: validate the result -- Workers must be 1..64, Port must be 1..65535 -- and
// join every violation into a single error with errors.Join, each one wrapping
// ErrInvalidConfig via %w, instead of returning nil unconditionally.
func LoadConfig(getenv func(string) string) (Config, error) {
	cfg := Config{Port: 8080, Workers: 4, LogLevel: slog.LevelInfo}

	if v := getenv("PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			cfg.Port = p
		}
	}
	if v := getenv("WORKERS"); v != "" {
		if w, err := strconv.Atoi(v); err == nil {
			cfg.Workers = w
		}
	}
	if v := getenv("LOG_LEVEL"); v != "" {
		var lvl slog.Level
		if err := lvl.UnmarshalText([]byte(v)); err == nil {
			cfg.LogLevel = lvl
		}
	}

	return cfg, nil
}
