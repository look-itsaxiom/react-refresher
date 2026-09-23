This module has two independent pieces: a bounded worker pool, and config loading with
joined validation. Both are things a real service's `main.go` and `internal/` packages
need on day one.

## `pool.go` — `Run`

```go
type Job struct {
	ID   string
	Cost int
}

type Result struct {
	ID  string
	Out int
	Err error
}

func Run(ctx context.Context, jobs []Job, workers int, fn func(context.Context, Job) (int, error)) ([]Result, error)
```

- Process `jobs` with **exactly `workers` goroutines**, not one at a time.
- The returned `[]Result` must be in the **same order as `jobs`**, regardless of which
  goroutine finishes first — write each result to its job's index, don't append in
  completion order.
- If `ctx` is cancelled while jobs remain, **stop scheduling new ones** and return
  `ctx.Err()`. Jobs that had already started keep running to completion, and their
  results stay in the returned slice; jobs that never started are left at their
  zero-value `Result`.
- **Every goroutine `Run` starts must exit before `Run` returns** — no goroutine should
  still be running (or blocked) after the function returns, cancelled or not.
- A per-job error from `fn` belongs in that job's `Result.Err`. It must not stop the pool
  from processing the rest of `jobs`, and it must not be returned as `Run`'s own error.

## `config.go` — `LoadConfig`

```go
type Config struct {
	Port     int
	Workers  int
	LogLevel slog.Level
}

var ErrInvalidConfig = errors.New("invalid config") // already declared

func LoadConfig(getenv func(string) string) (Config, error)
```

`getenv` stands in for `os.Getenv` so tests can supply a fake environment. Read `PORT`,
`WORKERS`, and `LOG_LEVEL` through it (`slog.Level` has an `UnmarshalText` method that
accepts `"debug"`, `"info"`, `"warn"`, `"error"`, case-insensitively — use it instead of
writing your own parser). Leave a variable at its default when `getenv` returns `""` for
it:

- `Port` defaults to `8080`.
- `Workers` defaults to `4`.
- `LogLevel` defaults to `slog.LevelInfo`.

Then validate:

- `Workers` must be between `1` and `64` inclusive.
- `Port` must be between `1` and `65535` inclusive.

On success, return the populated `Config` and a `nil` error. On failure, return a zero
`Config{}` and a **single joined error** (`errors.Join`) naming *every* problem at once —
not just the first one found — with each individual error wrapping `ErrInvalidConfig` via
`%w` so `errors.Is(err, ErrInvalidConfig)` is `true` on the joined result.

Run the tests locally with the command shown on the left, or click **Run go test**.
