# Go, read through TypeScript eyes

This track assumes you're interviewing for a role that touches React, Go, GraphQL, and
PostgreSQL on a project-management product that spans multiple organizations — tasks,
projects, dependencies, vendors. Go is the one language in that stack you likely haven't
written. The good news: Go is small. The entire spec fits in your head in an afternoon. The
bad news: it is small on purpose, and it will actively refuse to let you write TypeScript with
`func` instead of `function`. This lesson is the map from what you already know to what's
actually there. It's current for Go 1.25 (August 2025), the version on this machine.

## Packages and modules, not ES modules

A Go **module** is roughly a `package.json`: `go.mod` names it and pins a Go version.

```
module tasks

go 1.25
```

A **package** is a directory of `.go` files, roughly a directory you'd `import` from — except
there's no per-file export list. Every file in a directory shares one `package` declaration,
and visibility is a naming convention, not a keyword: an identifier starting with a capital
letter is exported from the package; lowercase is package-private. There is no `export` and no
default export — `import "tasks"` gets you everything capitalized in that package, addressed
as `tasks.ParseTasks`, `tasks.Task`. Renaming a function from `parseLine` to `ParseLine` *is*
the act of exporting it.

## Types without the word "interface" meaning what you'd guess

Go has `struct` for data and `interface` for behavior, but a Go `interface` is not a TypeScript
`interface`. TypeScript's `interface` and `type` are both structural at the type level, and you
explicitly write `class Foo implements Bar`. Go interfaces are structural *and implicit*: a
type satisfies an interface just by having the right methods, with no declaration anywhere
that says so.

```ts
// TypeScript: explicit
interface Stringer { toString(): string; }
class Task implements Stringer { toString() { return this.title; } }
```

```go
// Go: implicit. Task satisfies Stringer because it has the method — that's the whole rule.
type Stringer interface { String() string }
type Task struct { Title string }
func (t Task) String() string { return t.Title }
```

This is why idiomatic Go interfaces are tiny (often one method, like `io.Reader`) and defined
at the *consumer*, not the producer — you write the interface your function needs, and
anything with a matching method already satisfies it, including types from packages that have
never heard of your interface.

## Zero values: no `undefined`, no `null`

Every Go type has a **zero value**, and a declared-but-unassigned variable is never
uninitialized — `var n int` is `0`, `var s string` is `""`, `var b bool` is `false`, `var t
Task` is a `Task` with every field at its own zero value, `var p *Task` is `nil`. There's no
`undefined`, no "cannot access property of undefined." The tradeoff: your code must decide what
"absent" means field by field. A `Status` typed as `""` and a `Status` typed as `"todo"` are
both valid Go values; you don't get a free `undefined` to mean "not set yet." Reach for a
pointer (`*Task`, nilable) or a explicit sentinel when zero-vs-absent actually matters.

## Structs and pointers: when a method needs `*T`

A `struct` is your object literal's static shape, declared once:

```go
type Task struct {
    ID       string
    Title    string
    Estimate time.Duration
    Deps     []string
}
t := Task{ID: "PROJ-1", Title: "Draft the schema"}
```

Go passes everything **by value** — structs, arrays, the lot. `func rename(t Task)` gets a
*copy*; mutating `t.Title` inside it does nothing to the caller's struct. To mutate the
caller's data (or avoid copying a large struct on every call), a method takes a **pointer
receiver**:

```go
func (t *Task) Rename(title string) { t.Title = title } // mutates the caller's Task
func (t Task) Summary() string      { return t.Title }   // copy is fine, read-only
```

Rule of thumb, and the one every Go interviewer expects you to know: if any method on a type
needs a pointer receiver, make them *all* pointer receivers, for consistency and because a
mixed method set can silently fail to satisfy an interface. `&Task{...}` takes the address of a
literal; Go also auto-takes-the-address for you when you call a pointer method on an
addressable value, which is most of the time you'll notice the rule at all.

## Slices: arrays with a memory of where they came from

A Go array (`[3]int`) is fixed-length and rarely used directly. A **slice** (`[]int`) is what
you reach for — a view (pointer, length, capacity) over a backing array, closer to a
`Float64Array` view than to a JS `Array`. `make([]Task, 0, 10)` preallocates capacity;
`append(s, x)` grows it, reusing the backing array *if there's spare capacity* and allocating a
new one otherwise. That "if" is the gotcha:

```go
a := make([]int, 2, 4)          // len 2, cap 4 — 2 spare slots
b := append(a, 99)               // fits in spare capacity: b shares a's backing array
b[0] = -1                        // a[0] is now -1 too — a and b alias
c := append(a, 1, 2, 3)          // doesn't fit: c gets a new backing array, no alias with a
```

Two slices that look independent can silently share memory, and whether they do depends on
capacity you can't see by reading the code. `copy(dst, src)` makes a real, independent copy
when you need one — reach for it whenever a function returns a slice derived from an input the
caller still holds a reference to.

## Maps: zero value is nil, missing key is the zero value

`map[Status][]Task` is your `Record`/`Map`. Two things trip up every TypeScript developer's
first week: a `nil` map (the zero value of a map type) reads like an empty map — `len(m) == 0`,
`m["x"]` returns the zero value — but **writing** to a nil map panics, so you must
`make(map[K]V)` or use a composite literal before you assign into it. And reading a missing key
never throws; it returns the value type's zero value, which is indistinguishable from a key
that's present and legitimately zero. The **comma-ok** idiom is how you tell them apart:

```go
v, ok := m["missing"] // v is the zero value, ok is false
if count, ok := scores["PROJ-1"]; ok { /* key was actually present */ }
```

## `for range`: three generations in three Go versions

`for i, v := range items` is your `for...of`/`.entries()`. Three changes matter if your mental
model is pre-2024 Go (all still current in 1.25):

- **Go 1.22** made loop variables **per-iteration** instead of one variable reused and mutated
  across the whole loop. Before 1.22, `for _, id := range ids { go func() { fetch(id) }() }`
  captured the *same* `id` in every goroutine (a bug every Go tutorial used to warn about); from
  1.22 on, each iteration gets its own `id`, and that pattern is simply correct now.
- **Go 1.22** also added **range-over-int**: `for i := range 10` counts `0` through `9`, no
  `for i := 0; i < 10; i++` needed when you don't need a start or step.
- **Go 1.23** added **range-over-func**: `range` can iterate a function of type `func(yield
  func(V) bool)` (or the two-value form), so a package can hand you a custom, lazy iterator —
  `maps.Keys`, `slices.Values`, and friends in the standard library are written this way — and
  you consume it with a plain `for range`, no separate iterator-protocol boilerplate.

## No exceptions: errors are values

Go has no `try`/`catch`. Any function that can fail returns an `error` as its last value, by
convention, and the caller is expected to check it immediately:

```go
task, err := ParseTaskLine(line)
if err != nil {
    return fmt.Errorf("parsing task: %w", err) // wrap, don't discard the cause
}
```

`error` is itself a one-method interface (`Error() string`), so any type can be an error.
`fmt.Errorf("...: %w", err)` **wraps** an error, preserving it for later inspection without
stringly-typed matching: `errors.Is(err, ErrNotFound)` walks the wrap chain checking identity
against a **sentinel error** (a `var ErrX = errors.New("...")`, Go's answer to a custom
exception class you'd check with `instanceof`); `errors.As(err, &myErr)` walks it looking for a
concrete error *type* to unwrap into, when you need fields off it, not just identity.

`panic` is not `throw`. It unwinds the stack and, uncaught, crashes the program — reserved for
programmer errors (nil dereference, index out of range) and truly unrecoverable state, not for
"the user typed something invalid." A library that panics on bad input instead of returning an
`error` is considered rude. `recover` (only useful inside a `defer`) can stop a panic from
propagating, but you reach for it at process boundaries (an HTTP server recovering per-request),
not as routine control flow.

## Generics: closer to TypeScript than you'd expect, with two gaps

Go generics (since 1.18) look familiar:

```go
func Keys[K comparable, V any](m map[K]V) []K {
    keys := make([]K, 0, len(m))
    for k := range m { keys = append(keys, k) }
    return keys
}
```

`any` is `interface{}` under a friendlier name — closer to `unknown` than TS's `any`, since Go
still makes you narrow (a type switch or assertion) before you can do anything type-specific
with a value typed `any`. `comparable` is a built-in constraint (any type usable with `==`) with
no TS equivalent — TS doesn't need it because structural equality isn't part of its type
system the way `map` keys demand it in Go. The two real gaps versus TS generics: **no
variance** (Go doesn't reason about a `[]Dog` being assignable where `[]Animal` is expected,
covariance/contravariance just don't apply to generic instantiations), and **no partial
inference** (Go infers all type arguments from the call or none; you can't pin one type
parameter explicitly and let the rest infer the way `useState<Task>()` does).

## Further reading (optional)
- [A Tour of Go](https://go.dev/tour/) — the official interactive walkthrough of everything above
- [Effective Go](https://go.dev/doc/effective_go) — the canonical style and idiom guide
- [Go 1.22 release notes: for loop semantics](https://go.dev/doc/go1.22) — the per-iteration variable change
- [Go blog: Range over Function Types](https://go.dev/blog/range-functions) — the 1.23 iterator addition
