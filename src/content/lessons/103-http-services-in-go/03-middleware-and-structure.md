# Middleware and structure

## Middleware is one function type

```go
type Middleware func(http.Handler) http.Handler
```

Take a handler, return a handler that wraps it. That's it -- no separate interface, no `(req, res, next)` triple to thread through by hand. Writing one middleware yourself makes the shape click:

```go
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r) // do work before AND after this line
		log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
	})
}
```

`next.ServeHTTP(w, r)` is the `next()` call from Express middleware -- except here it's not optional or implicit. If you don't call it, the chain stops there (which is exactly how an auth middleware rejects a request: write a 401 and return without calling `next`).

## Composing a chain, and why order is the whole design

```go
func Chain(h http.Handler, mws ...func(http.Handler) http.Handler) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}

handler := Chain(tasksHandler, RequestID, Recover, Logger(logger), Timeout(5*time.Second))
```

With this `Chain`, the first argument after `h` is outermost -- the first middleware to see the request, the last to see the response. Order isn't cosmetic:

- **`RequestID` before `Logger`** -- the logger reads the request ID from context, so it has to run after `RequestID` has set it.
- **`Recover` near the outside** -- if it's nested inside something that can itself panic, that panic escapes unrecovered. Put it as close to the outermost position as you reasonably can.
- **`Timeout` around the handler, not around `Recover`** -- you generally want a panic recovered and turned into a clean 500 *before* a timeout would also be racing to write to the same response.

There's no framework enforcing this -- getting the order right is the exercise.

## Request IDs and structured logging (preview)

A request ID lets you grep one request's log lines out of a shared stream across every service it touched. Set it in context, not just a response header, so every downstream call and log line can read it without threading it through every function signature:

```go
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-ID")
		if id == "" {
			id = generateID()
		}
		w.Header().Set("X-Request-ID", id)
		ctx := context.WithValue(r.Context(), requestIDKey, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

`log/slog` (standard library since Go 1.21) is the structured-logging equivalent of `pino` or `winston`'s JSON mode: `logger.Info("request", "method", r.Method, "status", status)` emits one JSON object per call, not a formatted string you'd have to parse back apart. Lesson 104 covers `slog` handlers, levels, and attaching a logger to a `Server` struct in depth -- here it's just the shape you need to make `Logger` middleware testable: write to a `*slog.Logger` backed by a JSON handler in tests, and assert on the decoded fields instead of a string.

## Panic recovery

A panic in one handler must not take the whole server down. `net/http`'s own connection loop already recovers panics from handlers reached through `Serve`/`ListenAndServe` (it logs a stack trace and closes that connection) -- but you still want your own `Recover` middleware, for two reasons: you control the response body (a clean JSON envelope instead of a closed connection with no response at all), and `httptest`-based tests call a handler's `ServeHTTP` directly, bypassing that built-in recovery entirely. An unrecovered panic in a handler under test crashes the test binary, not just that one test.

```go
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				writeError(w, http.StatusInternalServerError, "internal_error", "internal server error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
```

## Timeouts: `context.WithTimeout` and `http.TimeoutHandler`

You can bound a handler by hand with `context.WithTimeout`, but the standard library ships `http.TimeoutHandler(next, d, msg)` for exactly this: it runs `next` on a background goroutine against a buffered response writer, and if `d` elapses first, it writes `msg` with a **503 Service Unavailable** to the real response and lets the background goroutine finish writing into the (now-discarded) buffer instead of the live connection. That buffering is what makes it safe -- a hand-rolled version that just races a `select` against `ctx.Done()` and writes to the real `ResponseWriter` from both sides risks two goroutines writing to the same response concurrently. One thing to know if you use `TimeoutHandler`: on the timeout path it writes directly to the outer `ResponseWriter` without calling back into your handler, so if you want a `Content-Type` header on the timeout body, set it *before* handing the request to `TimeoutHandler`, not inside the wrapped handler.

## CORS

CORS is entirely response headers (`Access-Control-Allow-Origin`, preflight handling for non-simple requests) and fits the same middleware shape -- it's involved enough to earn its own treatment in [lesson 65, "CORS, explained properly"](/lessons/65-cors-explained). The short version for a Go service: handle `OPTIONS` requests before they reach your route handlers, and never reflect `Access-Control-Allow-Origin: *` back for a request that also sends credentials.

## Auth middleware: put a principal in context

```go
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal, err := authenticate(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized", "missing or invalid credentials")
			return
		}
		ctx := context.WithValue(r.Context(), principalKey, principal)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

Same shape as `RequestID`: validate, stash the result in context, call `next`. Handlers read it with a typed accessor (`PrincipalFrom(ctx)`), the same pattern `RequestIDFrom` uses. This is also where **per-route vs. global** matters: `RequestID`, `Recover`, `Logger`, and `Timeout` are almost always global (every route needs them); `RequireAuth` is usually per-route or per-route-group, since a public health check or login endpoint can't require the very credential it's meant to issue.

```go
mux.Handle("GET /tasks/{id}", Chain(getTaskHandler, RequireAuth))     // protected
mux.HandleFunc("GET /healthz", healthzHandler)                         // not
handler := Chain(mux, RequestID, Recover, Logger(logger))              // global, wraps the whole mux
```

## Dependency injection without a DI container

Go doesn't have (or need) a framework-level DI container for a service this size. A `Server` struct holding its dependencies as fields, with handlers as its methods, *is* the injection:

```go
type Server struct {
	store  TaskStore
	logger *slog.Logger
}

func NewServer(store TaskStore, logger *slog.Logger) *Server {
	return &Server{store: store, logger: logger}
}

func (s *Server) listTasks(w http.ResponseWriter, r *http.Request) {
	tasks, err := s.store.List(r.PathValue("projectID"))
	// ...
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /projects/{projectID}/tasks", s.listTasks)
	return mux
}
```

`store` is an interface, not a concrete Postgres type, so a test builds a `Server` with an in-memory fake and never touches a real database. This is the same seam a `TaskService` constructor-injected with a repository interface gives you in a Nest or Spring backend -- Go just gets there with a struct literal instead of a decorator and a container.

## Organizing a small service

For a service this size, three files carry most of the weight: `routes.go` (the `Server.Routes()` method wiring paths to methods), `handlers.go` (the handler methods themselves), and `middleware.go` (the chain-building functions from this lesson). Growth from there is by *feature*, not by *layer* -- a `tasks.go` and `projects.go` each holding their own handlers reads better at scale than one `handlers.go` with everything in it, but for an interview-sized API, three files is the right amount of ceremony.

## The interview-classic answer shape

"Design a small REST API for tasks" gets asked close to verbatim. The shape that reads as competent:

1. **Resource paths, not verbs**: `GET/POST /projects/{id}/tasks`, `GET/PATCH /tasks/{id}`, not `/getTasks` or `/updateTaskStatus`.
2. **A `Store` interface**, not a concrete database type, injected into the `Server`.
3. **One error envelope**, used by every handler, with the 400/404/422 distinctions from the previous concept.
4. **Middleware for request ID, recovery, logging, and timeouts**, applied once around the whole mux, not copy-pasted into each handler.
5. **`httptest`-based handler tests** against a fake store, not a live database -- fast, and the type signature of `Store` *is* the test seam.

## Testing strategy

Handler tests use `httptest.NewRequest`/`NewRecorder` against a table of `{method, path, body} -> {status, body}` cases, backed by a fake or in-memory `Store` -- never a real database in a handler test; that's what integration tests one layer down are for. Assert on decoded JSON shape and status codes, not on raw response bytes, so a harmless formatting change (key order, whitespace) doesn't break the suite. Middleware gets tested in isolation, one property at a time: an ordering probe (a middleware that appends to a header, so you can read the call order back off the response) for `Chain`, a panicking handler for `Recover`, a slow handler for `Timeout`, a `slog.NewJSONHandler` writing to a `bytes.Buffer` for `Logger`. Both exercises in this lesson follow exactly this pattern.

## Further reading (optional)

- [net/http package docs](https://pkg.go.dev/net/http)
- [log/slog package docs](https://pkg.go.dev/log/slog)
- [httptest package docs](https://pkg.go.dev/net/http/httptest)
- [CORS, explained properly (lesson 65)](/lessons/65-cors-explained)
