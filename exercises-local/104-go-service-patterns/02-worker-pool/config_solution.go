//go:build solution

package pool

import (
	"errors"
	"fmt"
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

// LoadConfig reads PORT, WORKERS, and LOG_LEVEL through getenv, defaults unset
// variables to Port 8080, Workers 4, and LogLevel info, and validates the result --
// failing fast with every problem joined into one error instead of stopping at the
// first one.
func LoadConfig(getenv func(string) string) (Config, error) {
	cfg := Config{Port: 8080, Workers: 4, LogLevel: slog.LevelInfo}
	var errs []error

	if v := getenv("PORT"); v != "" {
		p, err := strconv.Atoi(v)
		if err != nil {
			errs = append(errs, fmt.Errorf("%w: PORT must be an integer, got %q", ErrInvalidConfig, v))
		} else {
			cfg.Port = p
		}
	}
	if v := getenv("WORKERS"); v != "" {
		w, err := strconv.Atoi(v)
		if err != nil {
			errs = append(errs, fmt.Errorf("%w: WORKERS must be an integer, got %q", ErrInvalidConfig, v))
		} else {
			cfg.Workers = w
		}
	}
	if v := getenv("LOG_LEVEL"); v != "" {
		var lvl slog.Level
		if err := lvl.UnmarshalText([]byte(v)); err != nil {
			errs = append(errs, fmt.Errorf("%w: LOG_LEVEL %q is not a valid level", ErrInvalidConfig, v))
		} else {
			cfg.LogLevel = lvl
		}
	}

	if cfg.Workers < 1 || cfg.Workers > 64 {
		errs = append(errs, fmt.Errorf("%w: Workers must be between 1 and 64, got %d", ErrInvalidConfig, cfg.Workers))
	}
	if cfg.Port < 1 || cfg.Port > 65535 {
		errs = append(errs, fmt.Errorf("%w: Port must be between 1 and 65535, got %d", ErrInvalidConfig, cfg.Port))
	}

	if len(errs) > 0 {
		return Config{}, errors.Join(errs...)
	}
	return cfg, nil
}
