# Concurrency and the toolchain

Concurrency is where Go stops resembling TypeScript at all, and it's usually the part of a Go
interview that separates "read the docs last night" from "used it." The toolchain, by contrast,
is the part that should feel like a relief after npm.

## Goroutines are not Promises

`go f()` starts `f` running concurrently and returns immediately — syntactically it looks like
firing off a Promise, but the execution model underneath is nothing alike. A goroutine is a few
KB of stack that grows as needed (not an OS thread, not a heap-allocated callback record), and
the Go runtime multiplexes potentially millions of them onto a small number of OS threads. Since
Go 1.14, goroutines are **preemptively scheduled** — the runtime can suspend one mid-function at
a safe point, not just at explicit yield points — so a goroutine stuck in a tight CPU loop
doesn't starve the others the way a synchronous JS loop starves the event loop.

There's no function coloring. JavaScript's `async`/`await` forces you to mark every caller of an
async function `async` too, all the way up. Go has one kind of function; any function can be
called with `go` in front of it, and "does this block" isn't a property of the function's type.
The cost you take on in exchange: nothing stops two goroutines from touching the same variable
at once, and Go will not warn you at compile time. That's what the next two tools are for.

## Channels: typed pipes, not typed values

A channel is a typed conduit between goroutines: `ch := make(chan int)` is **unbuffered** — a
send blocks until a receive is ready, which makes a channel operation a synchronization point,
not just a mailbox. `make(chan int, 4)` is **buffered**: sends succeed without a receiver until
the buffer fills. `select` waits on multiple channel operations at once, the concurrency
equivalent of `Promise.race`, but ongoing rather than settling once:

```go
select {
case v := <-results:
    handle(v)
case <-ctx.Done():
    return ctx.Err()
}
```

Closing a channel (`close(ch)`) signals "no more values" to every receiver; `for v := range ch`
drains it until closed, and a receive on a closed channel returns the zero value immediately
instead of blocking forever — the comma-ok form (`v, ok := <-ch`) tells you which. Only the
sender should close a channel, and closing an already-closed channel panics.

## Coordinating goroutines: WaitGroup and Mutex

`sync.WaitGroup` waits for a set of goroutines to finish. As of **Go 1.25**, the idiomatic form
is `wg.Go(f)`, which starts `f` in a new goroutine and handles the `Add`/`Done` bookkeeping for
you:

```go
var wg sync.WaitGroup
for _, id := range ids {
    wg.Go(func() { process(id) }) // per-iteration id (Go 1.22+) — no shadowing dance needed
}
wg.Wait()
```

Before 1.25, the same thing needed manual `wg.Add(1)` before each `go`, and `defer wg.Done()`
inside it — you'll still see that shape in older code and it still works, `wg.Go` just removes
the chance to get the bookkeeping wrong.

`sync.Mutex` guards shared state the way you'd guard it in any language with real threads:
`mu.Lock()` / `defer mu.Unlock()` around every read or write of the protected value. The Go
proverb is "don't communicate by sharing memory; share memory by communicating" — prefer a
channel to hand ownership of a value between goroutines one at a time over a mutex guarding a
value multiple goroutines poke at concurrently. In practice: reach for a channel when goroutines
are *handing off* work or results, and a mutex when goroutines are *sharing* one small piece of
state (a counter, a cache) they all need to touch. A counter behind a `Mutex` is normal, idiomatic
Go; you don't need a channel for everything.

`context.Context` — the standard way to carry cancellation and deadlines across goroutine and
API boundaries — gets a full treatment in the service-patterns lesson later in this track. For
now: a `context.Context` is a value you pass explicitly (usually as a function's first
parameter), and `ctx.Done()` is a channel that closes when the work should stop.

The **race detector** (`go test -race`) instruments memory access and catches unsynchronized
concurrent access that a normal test run won't — it needs a C toolchain available on some
platforms, so treat it as a tool to reach for locally and in CI, not something every exercise
here runs by default.

## The go tool

One binary, no separate linter/bundler/test-runner to install:

- `go run main.go` — compile and run, for scripts and quick checks
- `go build` — compile to a binary
- `go test ./...` — run tests in every package under the current directory
- `go vet ./...` — static analysis for real bugs (`Printf` format mismatches, unreachable
  code, struct fields you meant to compare but didn't) — narrower and more mechanical than a JS
  linter's style rules, and worth running before every commit
- `go fmt` (or the `gofmt` binary directly) — reformats source, and it is **not
  optional-by-convention** the way Prettier is: `gofmt` output is the one true formatting, there
  are no config options to bikeshed, and CI in most Go shops fails a diff that isn't
  `gofmt`-clean
- `go mod tidy` — adds missing and removes unused dependencies from `go.mod`, your
  `npm install` plus `depcheck` in one command
- `go doc fmt.Errorf` — prints a symbol's doc comment from the terminal, faster than opening a
  browser for anything in the standard library

Editor support (`gopls`, the Go language server) gives you the jump-to-definition,
inline-errors, auto-import experience `tsserver` gives you in TS — install the Go extension for
your editor and it configures `gopls` for you; there's no separate `tsconfig.json`-equivalent
to hand-tune for a small project.

## Testing conventions

Go's `testing` package is deliberately minimal — no `describe`, no matcher library in the
standard library, just functions and `if`. The conventions that make it feel structured:

- **Table-driven tests**: a slice of `{name, input, want}` structs, looped with `t.Run(name,
  func(t *testing.T) {...})` per case — the idiomatic stand-in for `it.each`.
- **`t.Fatalf` vs `t.Errorf`**: `Fatalf` stops the current test immediately (use it when a later
  assertion would panic on bad data, like indexing into a result that might be empty);
  `Errorf` records the failure and keeps running the rest of the test, so you see every
  mismatch in one run instead of fixing them one at a time.
- **`t.Helper()`**: marks a function as a test helper so failures inside it report the
  *caller's* line number, not the helper's — the Go equivalent of a custom Testing Library
  matcher pointing at your assertion, not its own internals.
- **`testing/fstest`** provides an in-memory `fs.FS` for testing code that reads files, without
  touching the real filesystem — the Go analog of mocking `fs` in Node.
- `go test ./...` is your one command for "run everything," recursive by default; no
  `--testPathPattern` needed for the common case.

## TS → Go phrasebook

| TypeScript / JS | Go |
|---|---|
| `interface`/`type` (structural, explicit `implements`) | `interface` (structural, implicit — no `implements`) |
| `undefined` / optional field | zero value (`""`, `0`, `nil`, ...) — always initialized |
| `class`, `this` | `struct` + methods with a receiver (`func (t *Task) ...`) |
| `throw` / `try`/`catch` | return an `error` as the last value; caller checks it |
| custom `Error` subclass | sentinel `var Err... = errors.New(...)`, matched with `errors.Is` |
| `Promise<T>` / `async`/`await` | goroutine (`go f()`) + channel, or `sync.WaitGroup` |
| `Promise.race` | `select` over channels |
| `Array<T>` | slice (`[]T`) — a view over a backing array, not a value type |
| `Map<K, V>` / `Record<K, V>` | `map[K]V` — nil-safe to read, panics to write if nil |
| `[...arr]` (defensive copy) | `copy(dst, src)`, or `slices.Clone` |
| generic `<T>` | generic `[T any]`, with `comparable` for map-key-safe types |
| `npm`/`npx`/eslint/Prettier | `go mod`, `go run`, `go vet`, `gofmt` — one tool, no config |

## Further reading (optional)
- [Go blog: Share Memory By Communicating](https://go.dev/blog/codelab-share) — the channels-vs-mutex proverb, worked through
- [sync package docs](https://pkg.go.dev/sync) — `WaitGroup`, `Mutex`, and `WaitGroup.Go` (1.25)
- [Go blog: The Go Race Detector](https://go.dev/blog/race-detector) — how `-race` works and its cost
- [Effective Go: Testing](https://go.dev/doc/effective_go#testing) — table-driven test conventions
