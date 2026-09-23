# Shaping a service

You know how to write a handler now (103). This lesson is about the layer above the
handler: how you organize a service as it grows past one `main.go`, how errors flow
through it, and how you log what it did. None of this is Go-specific in spirit -- it's
the same discipline as structuring a frontend app -- but Go's idioms for it are
distinctive enough to be worth naming.

## Project layout

Go has no framework-enforced layout the way Rails or Next.js do. The closest thing to an
official answer is go.dev's own guidance in "Organizing a Go module": put `main.go`
files for your binaries under `cmd/<name>/`, and anything you don't want other modules
importing under `internal/` -- the compiler enforces that boundary, not just convention.
Everything else starts flat: `auth.go`, `hash.go`, `config.go` at the package root, and
you split a file into its own subpackage only once it's grown enough to need one. That's
the opposite instinct from a frontend codebase, where `features/`, `components/`,
`hooks/` conventions get set up before the first file lands. In Go, premature package
boundaries cost more than premature files do, because packages are also import
boundaries and Go doesn't allow circular imports between them.

For a service specifically:

```
myservice/
  cmd/
    myservice/
      main.go        # flag/env parsing, wiring, Run()
  internal/
    api/              # HTTP handlers (103's territory)
    store/             # persistence
    billing/            # a domain package
  go.mod
```

`main.go` should be small: parse config, construct the dependencies, wire them together,
call `Run`, handle the top-level error. All the logic that's worth testing goes in
`internal/*`, where `go test ./...` can reach it without spinning up a process.

You'll also see `pkg/` in older Go codebases, for packages meant to be imported by other
modules. It's a convention some teams still use, not something the tool understands, and
current go.dev guidance doesn't call for it -- if a service isn't a library other
projects import, you don't need it.

## Dependency injection, by hand

Go doesn't have a DI framework in the way NestJS or Spring do, and most services don't
reach for one. The idiomatic pattern is a constructor that takes its dependencies as
interface parameters:

```go
type UserStore interface {
	GetUser(ctx context.Context, id string) (User, error)
}

type UserService struct {
	store UserStore
	log   *slog.Logger
}

func NewUserService(store UserStore, log *slog.Logger) *UserService {
	return &UserService{store: store, log: log}
}
```

The interface (`UserStore`) is declared where it's *consumed* (in the `UserService`
package), not where it's implemented -- the reverse of a Java or C# instinct. Your
Postgres-backed store never imports or implements an interface it knows about; it just
happens to satisfy whatever the consumer declared, because Go's interfaces are
structural. This is why Go interfaces tend to be tiny: one or two methods, named for
what the consumer needs, not for the concrete type's full surface.

For tests, you implement the same interface with a fake:

```go
type fakeStore struct{ user User }

func (f fakeStore) GetUser(context.Context, string) (User, error) { return f.user, nil }
```

No mocking framework, no container, no reflection -- just another struct that happens to
match the shape. At larger scale, some teams reach for a compile-time wiring generator
(`google/wire`) or a runtime one (`uber-go/fx`) to avoid hand-writing long constructor
chains in `main.go`; both exist and are worth knowing by name, but a service with a
dozen or so dependencies rarely needs either.

## Error handling patterns

103 covered returning errors from handlers. The patterns underneath:

**Wrap with context.** `fmt.Errorf("%w: ...", err)` -- specifically `%w`, not `%v` --
preserves the original error so callers can still find it with `errors.Is`/`errors.As`,
while adding what you knew at this layer that the lower layer didn't (which user, which
request):

```go
if err := s.store.GetUser(ctx, id); err != nil {
	return fmt.Errorf("loading user %s: %w", id, err)
}
```

**Sentinel errors** for values a caller branches on: `var ErrNotFound = errors.New("not found")`,
checked with `errors.Is(err, ErrNotFound)` — this still works through any number of
`%w` wraps.

**Typed errors** when the caller needs data out of the error, not just an identity:

```go
type ValidationError struct {
	Field string
	Msg   string
}
func (e *ValidationError) Error() string { return e.Field + ": " + e.Msg }
```

retrieved with `errors.As(err, &target)`, which also unwraps.

**`errors.Join`** (Go 1.20) combines several errors into one that satisfies `errors.Is`
and `errors.As` for any of them -- useful for "validate everything, report every
problem" instead of stopping at the first failure (the worker-pool exercise below builds
exactly this for config validation).

**Map domain errors to transport codes at the edge, once.** A `store.ErrNotFound` becomes
an HTTP 404 in the handler that's about to write a response -- not three layers down, and
not logged *and* returned as if they were two separate problems. Log once, at the layer
that has enough context to be useful (usually where you decide what to tell the client);
every layer below that just wraps and returns.

## `context.Context` as the first parameter

Every function that does I/O, or calls something that might, takes `ctx context.Context`
as its first parameter -- not stored on a struct, not optional. It carries two things:
cancellation/deadlines, and a small bag of request-scoped values.

```go
ctx, cancel := context.WithTimeout(parent, 3*time.Second)
defer cancel()
```

- `WithCancel` -- cancel by calling the returned function.
- `WithTimeout` / `WithDeadline` -- cancel when a duration elapses or a wall-clock time
  is reached.
- `WithCancelCause` (Go 1.20) -- like `WithCancel`, but callers can attach a reason
  (`context.Cause(ctx)` retrieves it), useful when several things could cancel the same
  context and you want to know which one did.
- `AfterFunc` (Go 1.21) -- `context.AfterFunc(ctx, f)` runs `f` in its own goroutine once
  `ctx` is done, and returns a `stop` function to cancel that registration -- a way to
  react to cancellation without a `select` loop of your own.

Always `defer cancel()` after any `With*` call, even if the context will also be
cancelled by its parent -- otherwise the timer or the parent's cleanup bookkeeping for
this child leaks until the deadline passes on its own.

Values go through `context.WithValue`, sparingly: a request ID, an authenticated user,
a trace span -- things every layer might want to log or attribute, not configuration or
optional parameters. If a function's behavior depends on a value, it belongs in the
function's actual parameter list, not buried in the context, where the compiler can't
tell you it's missing.

## Structured logging with `slog`

`log/slog` (standard library since Go 1.21) replaced `fmt.Println`/`log.Printf` as the
idiomatic choice for anything you'll ever want to query. A log line is a message plus
typed key-value attributes, not an interpolated string:

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
logger.Info("request handled", "method", r.Method, "path", r.URL.Path, "status", status, "duration_ms", elapsed.Milliseconds())
```

- Levels: `Debug`, `Info`, `Warn`, `Error` (plus custom levels if you need them).
- `logger.With("request_id", id)` returns a child logger that includes that attribute on
  every subsequent call -- build one per request in your middleware and pass it down
  instead of re-specifying the request ID at every call site.
- Handlers are swappable: `slog.NewJSONHandler` for production (one JSON object per
  line, trivial to parse), `slog.NewTextHandler` for a human reading a local terminal.
- One line per request, at the edge, with the outcome -- not a line per internal step.
  Internal steps get `Debug`, turned off in production.
- Never `fmt.Println` or `log.Printf` in service code: they bypass levels, structure, and
  whatever handler you configured, and you cannot filter or query free-form text at scale
  the way you can a `status=500` attribute.

## Further reading (optional)

- [Organizing a Go module](https://go.dev/doc/modules/layout)
- [log/slog package docs](https://pkg.go.dev/log/slog)
- [errors package docs](https://pkg.go.dev/errors)
- [context package docs](https://pkg.go.dev/context)
