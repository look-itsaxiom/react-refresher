# The template, piece by piece

The exercise that follows this step is a realistic take-home skeleton: a task-and-dependency
API with the easy 80% finished and the load-bearing 20% -- cycle detection and readiness --
left as TODOs. Before you touch it, walk through why it's laid out the way it is, because the
layout itself is part of what a reviewer is grading.

## Folder layout

```
cmd/api/main.go     # the binary: wires a Store to a Server, starts listening
store.go            # Task, the Store interface, and a complete MemStore
server.go           # HTTP handlers (this is where you work)
server_test.go      # httptest coverage for the handlers
migrations/         # schema, as a migration file, not inline DDL
docker-compose.yml  # one command to get Postgres running locally
github-workflows/   # the CI workflow (see the note on its name below)
README.md           # run / test / decisions / not-done
```

`cmd/api/main.go` existing as its own package matters more than it looks: it keeps `package
main` -- with its `os.Exit` and `flag` parsing and everything else that's annoying to unit
test -- completely separate from the package that holds your actual logic. `go test ./...`
still compiles it (so a broken `main.go` fails CI), but no test needs to spawn a real
process to exercise the HTTP layer; `server_test.go` drives the handlers directly through
`httptest`, the way lesson 103's tests did.

## The Store interface

```go
type Store interface {
	ListTasks(ctx context.Context, projectID string) ([]Task, error)
	CreateTask(ctx context.Context, t Task) (Task, error)
	AddDependency(ctx context.Context, predecessorID, successorID string) error
	Ready(ctx context.Context, projectID string) ([]Task, error)
}
```

Every method takes a `context.Context` first, even though `MemStore` ignores it -- a
Postgres-backed implementation wouldn't be able to add it later without changing every
caller, so it's part of the seam from the start. That's the same argument lesson 103 made
for the `Store` interface there: handlers depend on this interface, never on `*MemStore` or
a `*sql.DB` directly, so swapping storage doesn't touch a single handler.

The shipped `MemStore` is complete -- you don't implement it. A Postgres-backed `Store`
would use `database/sql` with the `pgx` stdlib driver (`pgx/v5/stdlib`), or a generated
layer from `sqlc` if you wanted typed queries without hand-writing `Scan` calls; either way
it would satisfy the same four methods and read from the schema below. Implementing that
backend isn't part of this exercise -- naming it as the obvious next step is exactly the
kind of "not done, and why" note a reviewer wants to see.

## The schema and the migration

`migrations/0001_init.sql` mirrors the domain from lesson 106: `tasks` and
`task_dependencies` as a directed edge table (`predecessor_id`, `successor_id`), because a
task can have more than one predecessor and more than one successor -- a single
self-referencing column on `tasks` can't express that. There's an index on
`tasks(project_id)` because every read in this API is scoped to a project, and an index on
`task_dependencies(successor_id)` because the readiness check looks up "does this task have
an unfinished predecessor" by successor. A `CHECK (predecessor_id <> successor_id)` stops
the trivial self-loop at the database; a longer cycle (A depends on B depends on A) can't be
expressed as a `CHECK` at all, which is why the exercise's cycle detection lives in Go, not
SQL -- the same tradeoff lesson 106 named directly.

Shipping this as a numbered migration file instead of a `CREATE TABLE` typed into a setup
script is one of the seniority signals from the previous step: it says you've thought about
how this schema changes after day one, not just how it looks on day one.

## docker-compose.yml

One service, Postgres 17, with a healthcheck (`pg_isready`) so anything that depends on the
database -- a startup script, a CI job -- can wait for "ready," not just "started." The image
tag is pinned to a major version with a comment hedging that you'd pin the exact patch
version you tested against before actually submitting; "postgres:latest" is the kind of
detail a reviewer notices precisely because it's the kind of thing that breaks a demo six
weeks after you wrote it.

## The React UI, kept to one screen

The prompt for a take-home like this almost always wants a UI that: lists tasks for a
project, lets you create one, and shows which ones are ready to start. Keep it to one
screen and reuse the optimistic-update pattern from lesson 113's status-toggle drill --
`useOptimistic` for the status flip, so clicking "start" feels instant and rolls back if the
request fails, rather than a disabled button and a spinner. A polished single screen beats
a multi-page UI where only the first page fully works; scope discipline in the frontend is
the same call you're making in the backend.

## GitHub Actions: `ci.yml`

The workflow in this exercise's folder is named `github-workflows/ci.yml` rather than
`.github/workflows/ci.yml` -- a leading-dot path would get treated as hidden by this
exercise's own file browser and Go's own tooling, which is a display-only workaround, not a
real-repo convention. Move it to `.github/workflows/` when you copy this template into an
actual submission.

Two jobs: one runs `go build`, `go vet`, and `go test` against a real Postgres **service
container** (not a mock), so integration tests that hit the database run in CI the same way
they'd run locally; the other runs `pnpm typecheck` and `pnpm test` for the frontend, the
way lesson 92 laid out. Every third-party action (`actions/checkout`, `actions/setup-go`,
`actions/setup-node`) is pinned to a commit SHA with the version as a trailing comment --
`uses: actions/checkout@<sha> # v4` -- per lesson 68's supply-chain rule: a tag can be moved
to point at different code without your workflow file changing; a SHA can't.

## The README skeleton

Four sections, in the order a reviewer reads them: **Run** (the exact commands, in order),
**Test** (`go test ./...`, plus the frontend command), **Decisions** (the two or three
choices you'd defend in the follow-up interview -- why an in-memory store, why DFS for
cycles instead of a recursive CTE, why one screen), and **Not done** (named gaps, one line
each, per the previous step's guidance).

## Presenting it in the follow-up interview

Reviewers almost always open the follow-up with "walk me through a decision you made."
Prepare one real tradeoff, not a tour of the whole codebase: why you chose DFS over a
recursive SQL query for cycle detection (a `CHECK` constraint can't express it, and doing it
in Go keeps the check colocated with the HTTP error it produces), or why the UI update is
optimistic instead of waiting on the server (the interaction lesson 113 covered). Naming the
gaps from your own README before they ask about them reads as ownership, not evasion; being
unable to defend a choice you made under time pressure reads worse than the choice itself.

## Further reading (optional)

- [pgx driver documentation](https://pkg.go.dev/github.com/jackc/pgx/v5) -- the Postgres
  driver referenced above for a real `Store` implementation.
- [sqlc documentation](https://docs.sqlc.dev/) -- generates typed Go from SQL, an alternative
  to hand-written `database/sql` code.
- [Docker Compose file reference -- healthcheck](https://docs.docker.com/reference/compose-file/services/#healthcheck) --
  the option used in this exercise's `docker-compose.yml`.
- [GitHub Actions -- service containers](https://docs.github.com/en/actions/using-containerized-services/about-service-containers) --
  how `ci.yml` runs Postgres for the integration test job.
