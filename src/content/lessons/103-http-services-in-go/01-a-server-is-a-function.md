# A server is a function

In Express, a route handler is `(req, res) => {}`. In Go, the equivalent is `func(w http.ResponseWriter, r *http.Request)`. That's the whole abstraction. `net/http` builds routing, middleware, JSON, and timeouts on top of one interface:

```go
type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}
```

`http.HandlerFunc` is an adapter that lets a plain function satisfy `Handler`, the same trick `React.forwardRef` uses to make a function look like a component. You'll write handlers as functions and let `HandlerFunc` do the wrapping; you rarely implement `Handler` on a custom type unless the handler needs its own fields (a store, a logger).

## Routing without a router library

Through Go 1.21, `http.ServeMux` only matched path prefixes -- no methods, no path parameters. Everyone reached for chi, gin, or echo just to write `GET /tasks/:id`. Go 1.22 (March 2024) rewrote the mux to support both, and it's the default choice for this course's exercises:

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /projects/{projectID}/tasks", listTasks)
mux.HandleFunc("POST /projects/{projectID}/tasks", createTask)
mux.HandleFunc("GET /tasks/{id}", getTask)
mux.HandleFunc("GET /files/{path...}", serveFile) // {path...} captures the rest, slashes included
```

A pattern is `[METHOD ][HOST]/[PATH]`. No method means "any method"; `GET` also matches `HEAD` automatically. Read a wildcard with `r.PathValue("id")`. Precedence goes to the more specific pattern -- `/posts/latest` beats `/posts/{id}`, and `GET /posts/{id}` beats `/posts/{id}` -- and two patterns that are ambiguous (neither is a strict subset of the other) panic *at registration time*, not at request time, which is a good tradeoff: you find the conflict in a test run, not in production. Register `/images/` (trailing slash) and a request for `/images` gets redirected to it, unless you also register the bare path. `{$}` matches only the exact end of the path, useful when you need `/posts/` to mean "the collection" and nothing under it.

This doesn't make chi/gin/echo pointless -- they still add regex constraints on parameters, middleware ecosystems, and OpenAPI generation that the standard mux doesn't have. But for the API shapes you'll build in an interview, the mux plus a small middleware chain (next concept) covers what a router library gave you in 2021.

## One request, one goroutine

`http.Server` spins up a new goroutine per accepted connection, and `ServeHTTP` runs on it. There's no event loop to block the way there is in Node -- a slow handler doesn't stall other requests -- but it also means handler state has to be request-scoped on purpose. A package-level `var lastUser Task` written by one handler is a data race the moment two requests land concurrently; pass everything either as a function argument, a receiver field set once at startup (a store, a logger), or a `context.Context` value (below).

## Reading and writing JSON

```go
var body struct {
	Title string `json:"title"`
}
r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // cap the body at 1MB
dec := json.NewDecoder(r.Body)
dec.DisallowUnknownFields()
if err := dec.Decode(&body); err != nil {
	writeError(w, http.StatusBadRequest, "invalid_body", "bad JSON")
	return
}
```

`MaxBytesReader` protects against a client streaming gigabytes into a handler that's just going to reject it anyway -- without it, decoding reads until the connection closes or memory runs out. `DisallowUnknownFields` turns a typo'd field name from a silently-ignored no-op into a 400, the same value `zod`'s `.strict()` or a tsyringe DTO gives you on the Node side.

Writing JSON has one rule that trips up people coming from `res.json()`: **set headers and call `WriteHeader` before you write any body bytes.** The first `Write` call implicitly sends a 200 if you haven't called `WriteHeader` yet, and headers are locked the instant the status line goes out.

```go
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v) // status is already sent; an encode error here can't change it
}
```

That last comment matters: if `Encode` fails after `WriteHeader(200)`, the client gets a 200 with a truncated body, not a 500. `json.Encoder` rarely fails on well-formed Go values (it does on `NaN`/`Inf` floats, cyclic structures, and channels), so structure your types to avoid those rather than trying to recover after the fact.

## Status codes and a consistent error shape

Pick one JSON error envelope and use it everywhere:

```json
{ "error": { "code": "invalid_title", "message": "title is required" } }
```

A frontend client can then switch on `error.code` instead of parsing `error.message` strings. Map the common cases: `201` for a create, with `Location` pointing at the new resource (`/tasks/42`); `204 No Content` for a delete or an action with nothing to return (and no body -- writing one after a 204 is a protocol violation most clients silently tolerate but shouldn't have to); `400` for "this JSON is malformed or missing a required field"; `422 Unprocessable Entity` for "this JSON is well-formed, but the value is invalid" (a status enum outside its allowed set, for example) -- the same 400-vs-422 split React Hook Form's client validation and a Zod schema validation error draw between "can't even parse this" and "parsed fine, wrong value."

## Context: deadlines, cancellation, and request-scoped values

Every `*http.Request` carries a `context.Context` (`r.Context()`). Three things ride on it:

- **Deadlines.** `context.WithTimeout(r.Context(), 5*time.Second)` bounds a downstream call (a database query, another service) to the request's remaining budget.
- **Client disconnects.** If the client closes the connection, `r.Context()` is canceled -- a long-running handler that checks `ctx.Err()` or selects on `ctx.Done()` can stop early instead of finishing work nobody will see. This is Go's answer to `AbortController` on `fetch`.
- **Request-scoped values**, via `context.WithValue`. Always key these with an unexported type (`type contextKey int`), never a bare string -- two packages using `"userID"` as a string key silently collide. A typed key can't collide with another package's.

```go
type contextKey int
const principalKey contextKey = iota

ctx := context.WithValue(r.Context(), principalKey, principal)
next.ServeHTTP(w, r.WithContext(ctx))
```

`context.Value` is for request metadata (a request ID, an authenticated principal), not for passing arguments a function could just take directly -- if a handler needs a value to do its job, prefer a parameter or a field on a `Server` struct over burying it in the context.

## Server timeouts: `ListenAndServe`'s defaults are a trap

```go
srv := &http.Server{
	Addr:              ":8080",
	Handler:           mux,
	ReadHeaderTimeout: 5 * time.Second,
	ReadTimeout:       10 * time.Second,
	WriteTimeout:      10 * time.Second,
	IdleTimeout:       120 * time.Second,
}
srv.ListenAndServe()
```

Calling `http.ListenAndServe(":8080", mux)` directly uses a zero-value `Server`, and a zero value means *no timeouts at all* -- a client that opens a connection and trickles one byte every 30 seconds ties up a goroutine indefinitely (this is a real, named class of attack: Slowloris). At minimum, set `ReadHeaderTimeout`; production services set all four. This is the Go equivalent of Node's `server.headersTimeout` and `server.requestTimeout`, except Go doesn't set any of them for you.

## Testing a handler without a running server

```go
req := httptest.NewRequest(http.MethodPost, "/projects/p1/tasks", strings.NewReader(`{"title":"Ship it"}`))
rec := httptest.NewRecorder()
handler.ServeHTTP(rec, req)

if rec.Code != http.StatusCreated {
	t.Fatalf("got %d, want 201", rec.Code)
}
```

`httptest.NewRequest` builds a `*http.Request` without opening a socket; `httptest.NewRecorder` is an `http.ResponseWriter` that captures the status, headers, and body into memory. No port binding, no goroutine, no network -- exactly the same value `supertest` gives you over a raw Express app, and the pattern every exercise in this lesson is graded with.

## Where this maps from Express/Hono/Next

| Express / Hono | Go |
|---|---|
| `app.get('/tasks/:id', handler)` | `mux.HandleFunc("GET /tasks/{id}", handler)` |
| `req.params.id` | `r.PathValue("id")` |
| `res.status(201).json(v)` | `w.WriteHeader(201); json.NewEncoder(w).Encode(v)` (status *then* body) |
| `express.json({ limit: '1mb' })` | `http.MaxBytesReader` + `json.Decoder` per-handler |
| middleware `(req, res, next) => {}` | `func(http.Handler) http.Handler` (next concept) |
| `supertest(app).get(...)` | `httptest.NewRequest` + `httptest.NewRecorder` |

The biggest mental shift isn't syntax, it's that nothing is implicit: no router auto-parses JSON, no framework picks default timeouts, no middleware is pre-installed. You compose all of it from `net/http` primitives, which is more typing than `express()` but nothing is happening that you didn't write.

## Further reading (optional)

- [net/http package docs](https://pkg.go.dev/net/http)
- [Routing Enhancements for Go 1.22](https://go.dev/blog/routing-enhancements)
- [encoding/json package docs](https://pkg.go.dev/encoding/json)
- [Go Concurrency Patterns: Context](https://go.dev/blog/context)
