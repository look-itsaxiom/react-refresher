# gqlgen: schema first, code generated

Lessons 75-79 built GraphQL's type system, execution model, and client caches as TypeScript
miniatures. A company whose GraphQL layer is written in Go is asking the same questions --
what's the resolver tree, where does N+1 come from, how do you limit query cost -- against a
different toolchain. This lesson is that toolchain.

## The Go GraphQL landscape

- **gqlgen** (`github.com/99designs/gqlgen`) is schema-first: you write SDL, gqlgen generates
  typesafe resolver interfaces and models from it, you fill in the resolver bodies. This is the
  toolchain most Go shops reach for, and the one this lesson teaches.
- **graphql-go/graphql** is code-first (closer to Apollo Server's programmatic schema
  construction): you build the schema as Go values -- `graphql.NewObject`, `graphql.Fields{}`
  -- with resolvers as reflection-driven closures. No generation step, but no compile-time check
  that a resolver's shape matches the schema either.
- **graph-gophers/graphql-go** sits in between: schema-first like gqlgen, but resolves fields by
  reflecting over methods on your existing Go types at runtime instead of generating resolver
  stubs ahead of time.
- **Ent's GraphQL integration** (`entgql`) generates both your data layer *and* a GraphQL schema
  from the same Ent schema definition -- a different tradeoff again, worth knowing exists if the
  service already uses Ent as its ORM.

gqlgen's pitch is the one that maps most directly onto what you already know from TypeScript
codegen (lesson 78): the schema is the single source of truth, and generation keeps your
resolvers and your SDL from drifting apart the same way `graphql-codegen` keeps a TypeScript
client's types honest against the schema. That's why it's the default choice for a new Go
GraphQL service, and the one worth being fluent in for an interview.

## The workflow

```graphql
# schema.graphqls
type Task {
  id: ID!
  title: String!
  status: TaskStatus!
  assignee: User
}

type Query {
  task(id: ID!): Task
  tasksByProject(projectID: ID!): [Task!]!
}
```

```yaml
# gqlgen.yml
schema:
  - schema.graphqls
exec:
  filename: generated.go
model:
  filename: models_gen.go
resolver:
  filename: resolver.go
models:
  Task:
    model: myapp/internal/store.Task   # bind to a struct you already have
  ID:
    model: github.com/99designs/gqlgen/graphql.ID
```

Running `go run github.com/99designs/gqlgen generate` (current gqlgen ships this as
`go tool gqlgen generate` once the module is a Go 1.24+ tool dependency; both invoke the same
generator) reads the schema and `gqlgen.yml`, then writes three things: **`generated.go`**, the
execution engine -- parsing, validation, the field-by-field walk from lesson 75's execution
model, none of which you touch by hand; **`models_gen.go`**, Go structs for every schema type
that isn't explicitly bound to one of your own (via `models:` in the config, the same idea as
`autobind`, which matches schema types to existing Go types by name automatically); and
**`resolver.go`** (or `schema.resolvers.go`), one stub method per field gqlgen couldn't resolve
from a struct field directly -- these are the ones you implement. A `//go:generate` comment
wired to this command means `go generate ./...` regenerates everything after a schema edit, the
same reflex as re-running `graphql-codegen` after changing a `.graphql` document.

**Custom scalars** (`scalar Time`, `scalar UUID`) need marshal/unmarshal functions you register
in `gqlgen.yml` under `models: Time: model: ...`, telling gqlgen how to convert between the wire
representation and a Go type (`time.Time`, `uuid.UUID`) -- there's no default the way `Int` or
`String` have one.

## The resolver shape

```go
func (r *queryResolver) Task(ctx context.Context, id string) (*model.Task, error) {
	task, err := r.Store.GetTask(ctx, id)
	if err != nil {
		return nil, err
	}
	return task, nil
}
```

Every resolver method gqlgen generates has this shape: `ctx` first, then the field's arguments
in schema order, returning the field's Go type and an `error`. `r` is a resolver struct (a
`queryResolver`, `mutationResolver`, or a resolver for any object type with fields that need
computation) holding whatever dependencies it needs -- a store, a logger -- the same
dependency-injection-via-struct-field pattern from lesson 103's `Server`.

Most fields don't need their own resolver at all: if `models_gen.go`'s `Task` struct already has
an `AssigneeID string` field and the schema's `Task.assignee` needs a full `User`, gqlgen
generates a resolver stub for `assignee` because it can't get there by direct field access. But
`Task.title` maps straight onto `Task.Title` and needs nothing. **Field resolvers matter for
lazy fields** -- a field that's expensive to compute (a joined table, an aggregate, a call to
another service) shouldn't be computed for every `Task` up front; making it its own resolver
means it only runs when a query actually selects it, mirroring GraphQL's core promise that a
client only pays for what it asks for.

`ctx` is how a resolver reaches things that aren't arguments: an authenticated principal (next
concept), a request ID, and -- critically for the next concept -- **per-request dataloaders**.
Attach them once, in a middleware wrapping the whole GraphQL handler, with `context.WithValue`
(lesson 103's rule about typed keys applies here exactly the same way), and every resolver in
that request's tree reads them back out.

## Errors

A resolver returns a plain Go `error`, and gqlgen turns it into an entry in the response's
`errors` array with the field's `path`, matching the null-propagation and partial-response
mechanics from lesson 75. To attach a machine-readable code (the way lesson 103's HTTP error
envelope had a `code` field a client could switch on), build a `*gqlerror.Error` with
`graphql.ErrorPathFromContext(ctx)` and an `Extensions` map:

```go
return nil, &gqlerror.Error{
	Message: "task not found",
	Path:    graphql.GetPath(ctx),
	Extensions: map[string]interface{}{"code": "NOT_FOUND"},
}
```

A common pattern: keep domain errors as sentinel values or typed errors in your store layer
(`store.ErrNotFound`, mirroring lesson 103's `errors.Is(err, ErrNotFound)`), then map them to
`gqlerror.Error` with the right extension code at the resolver boundary with `errors.As` /
`errors.Is` -- the store package stays GraphQL-agnostic, and only the resolver layer knows about
wire-level error shape.

## Serving it

```go
srv := handler.NewDefaultServer(generated.NewExecutableSchema(resolvers))
mux := http.NewServeMux()
mux.Handle("/query", srv)
```

`handler.NewDefaultServer` wires up the transports gqlgen ships out of the box: **POST** (the
general case, per lesson 75's GraphQL-over-HTTP coverage), **GET** for query-only operations,
**WebSocket** (`graphql-ws` protocol) for subscriptions, and multipart form uploads. It's a
`net/http` handler like any other -- everything from lesson 103 (timeouts, middleware chains,
`httptest`-based testing via gqlgen's own `client.New` helper, which posts GraphQL operations at
a test server and decodes the JSON response into a Go struct) applies unchanged.

**Introspection** (a client asking the schema to describe itself -- what GraphQL Playground and
codegen tools rely on) should be disabled in production with
`srv.Use(extension.Introspection{})` left out, or explicitly gated behind an environment check;
leaving it on exposes your entire schema, including fields and types you didn't mean to
advertise, to anyone who can reach the endpoint. **Query allow-lists** (only permit a
pre-registered set of operation hashes) go further than automatic persisted queries (below) by
rejecting anything not on the list outright, appropriate for a backend-for-frontend where the
client set is closed.

## Further reading (optional)

- [gqlgen — Getting started](https://gqlgen.com/getting-started/)
- [gqlgen — Complexity limits](https://gqlgen.com/reference/complexity/)
- [gqlgen — Automatic persisted queries](https://gqlgen.com/reference/apq/)
- [gqlgen — Error handling](https://gqlgen.com/reference/errors/)
