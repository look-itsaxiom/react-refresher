import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'http-services-in-go-quiz',
  title: 'Quiz: HTTP services in Go',
  questions: [
    {
      id: 'listen-and-serve-defaults',
      prompt:
        'A service ships with `http.ListenAndServe(":8080", mux)`. It passes load testing fine but occasionally hangs under real traffic until it stops accepting new connections. What is the most likely cause, and the fix?',
      choices: [
        { id: 'a', text: 'Go servers leak goroutines by default; the fix is to call runtime.GC() periodically.' },
        {
          id: 'b',
          text:
            "A zero-value http.Server (which is what ListenAndServe(addr, handler) constructs internally) has no read/write timeouts, so a client that opens a connection and sends data slowly -- or not at all -- can hold a goroutine indefinitely. The fix is to build an *http.Server explicitly and set ReadHeaderTimeout at minimum, ideally ReadTimeout/WriteTimeout/IdleTimeout too.",
        },
        { id: 'c', text: 'mux.HandleFunc is inherently single-threaded; switch to a third-party router.' },
        { id: 'd', text: 'This only happens over HTTP/2; disabling HTTP/2 fixes it.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "http.ListenAndServe's convenience form gives you a Server with every timeout field at its zero value, which net/http treats as \"no timeout.\" A slow or hostile client can occupy a connection's goroutine forever. Production code builds the Server struct and sets timeouts explicitly -- there is no safe default to opt out of.",
    },
    {
      id: 'unknown-fields',
      prompt:
        'A PATCH handler decodes the request body with a plain `json.NewDecoder(r.Body).Decode(&body)` -- no `DisallowUnknownFields`. A client sends `{"status": "done", "aprover": "alice"}` (a typo for "approver", a field the struct doesn\'t have). What happens?',
      choices: [
        { id: 'a', text: 'Decode returns an error naming the unknown field "aprover".' },
        {
          id: 'b',
          text:
            'Decode succeeds silently. The unknown field is dropped with no error, so a client with a typo\'d field name gets no feedback that it was ignored -- the request "succeeds" without doing what the client intended.',
        },
        { id: 'c', text: 'The server panics because the struct has no matching field.' },
        { id: 'd', text: 'Go infers a new field on the struct at runtime and stores the value anyway.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'encoding/json ignores object keys that don\'t match a struct field unless you opt into DisallowUnknownFields on the Decoder. Without it, typos and stale client code fail silently instead of loudly -- the same failure mode a non-strict Zod schema or an Express body without `express.json({ strict: true })` has on the Node side.',
    },
    {
      id: 'context-value-abuse',
      prompt:
        'A teammate proposes passing the database connection pool through context.WithValue so every handler can grab it with `ctx.Value("db").(*sql.DB)` instead of it being a field on a Server struct. What is the concrete problem with this, beyond style?',
      choices: [
        {
          id: 'a',
          text: "context.Value keys should be typed, unexported constants, not string literals like \"db\" -- but that's a lint issue, not the real problem here.",
        },
        {
          id: 'b',
          text:
            'A dependency a handler always needs to function -- not something that varies per-request -- belongs in the type signature (a struct field, a constructor argument), where the compiler enforces it exists and callers can see it. Context values are invisible to the type system: a typo\'d key or a missing WithValue call is a runtime panic on the type assertion, not a compile error, and nothing about the handler\'s signature reveals that it secretly needs a database.',
        },
        { id: 'c', text: 'context.Value has a hard limit of a few entries per request; a DB handle would overflow it.' },
        { id: 'd', text: 'Storing a *sql.DB in context prevents connection pooling from working.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "context.Value exists for request-scoped metadata that genuinely varies per call -- a request ID, an authenticated principal, a deadline. A dependency every handler needs regardless of the request (a DB pool, a logger, a config value) belongs in the handler's own state, typically a struct field set once at startup, so it's visible in the type and can't be silently missing.",
    },
    {
      id: 'timeout-handler-race',
      prompt:
        'You write your own timeout middleware by hand: start `next.ServeHTTP(w, r)` in a goroutine, and in the calling goroutine, `select` on a `done` channel vs. `time.After(d)`; on timeout, write a 503 directly to the same `w`. What is wrong with this, that `http.TimeoutHandler` avoids?',
      choices: [
        { id: 'a', text: 'Nothing -- this is exactly what http.TimeoutHandler does internally.' },
        {
          id: 'b',
          text:
            "If the timeout fires and you write a 503 to w from the calling goroutine, the original handler's goroutine is often still running and can still call w.Write or w.WriteHeader concurrently -- two goroutines mutating the same ResponseWriter with no synchronization, which is a data race and can corrupt the response or panic. http.TimeoutHandler avoids this by having the wrapped handler write into a private buffer, not the real ResponseWriter, until it's known which side \"wins.\"",
        },
        { id: 'c', text: 'Goroutines cannot access an http.ResponseWriter at all; this code would fail to compile.' },
        { id: 'd', text: 'select can only be used with channels of the same type as time.After, so this is a type error.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The bug is real and common: once you fire off a handler on its own goroutine, you no longer control when it touches the ResponseWriter. http.TimeoutHandler's internal timeoutWriter buffers everything the handler writes and only copies it to the real ResponseWriter if the handler finished before the deadline; on timeout, the real ResponseWriter is written to exactly once, from the timeout path, and the late handler's writes land in a buffer nobody reads.",
    },
    {
      id: 'unprotected-not-found',
      prompt:
        'A `GET /tasks/{id}` handler calls `store.Get(id)`, gets a generic error back (not one you check with `errors.Is(err, ErrNotFound)`), and responds `500` with `message: err.Error()` -- i.e. it forwards whatever the store returned as the client-facing message. Why is this a problem even if it "works" in a demo?',
      choices: [
        { id: 'a', text: "It isn't a problem; forwarding the underlying error is the most helpful thing you can do for API consumers." },
        {
          id: 'b',
          text:
            'Forwarding raw internal error strings to a client can leak implementation details -- a SQL error revealing table/column names, a file path, an internal hostname -- and it couples the API\'s response shape to whatever text an internal library happens to produce, which can change between dependency versions with no warning.',
        },
        { id: 'c', text: 'Go error messages are not valid UTF-8, so this will produce malformed JSON.' },
        { id: 'd', text: 'This only matters over HTTP/2, not HTTP/1.1.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Client-facing error messages should be written for the client, not copy-pasted from whatever the underlying error happened to say. Log the real error server-side (with the request ID) and return a stable, generic message and code to the caller -- the same discipline you'd apply to not leaking a stack trace in an Express error handler's JSON response.",
    },
    {
      id: 'mux-panic-vs-runtime',
      prompt:
        'Registering `mux.HandleFunc("/posts/{id}", h1)` and later `mux.HandleFunc("/{resource}/latest", h2)` in the same `ServeMux` panics at startup, even though neither pattern is individually invalid. Why does Go choose to panic here instead of just picking one at request time (e.g., "first registered wins")?',
      choices: [
        {
          id: 'a',
          text:
            "Because the two patterns genuinely conflict -- neither matches a strict subset of the other's requests (both can match \"/posts/latest\") -- so there's no principled rule for which one should win, and silently picking one would make routing depend on registration order in a way that's easy to get wrong and hard to notice. Failing at registration time (which a test run or even just starting the server exercises) surfaces the ambiguity immediately instead of as an intermittent routing bug in production.",
        },
        { id: 'b', text: 'ServeMux patterns must be registered in alphabetical order, and these two are out of order.' },
        { id: 'c', text: 'Wildcard patterns are limited to one per ServeMux; a second wildcard pattern always panics.' },
        { id: 'd', text: "It's a bug in Go 1.22's mux that will be fixed in a later release." },
      ],
      correctChoiceId: 'a',
      explanation:
        "The mux's precedence rule (\"most specific pattern wins\") only has a well-defined answer when one pattern's matches are a strict subset of the other's. When two patterns both match some requests the other doesn't, there's no specificity ordering between them, and Go treats that as a programming error to catch at startup rather than a runtime ambiguity to paper over.",
    },
  ],
};
