# Take-home: project tasks API

A tasks-and-dependencies API for a small project-management tool. Task title in the ready
queue is what a reviewer sees first, so start here.

## Run it

    docker compose up -d       # Postgres on :5432
    go run ./cmd/api           # API on :8080

## Test it

    go test ./...
    go vet ./...

## Decisions

- Store is an interface (`store.go`); the shipped implementation is in-memory so the API is
  runnable with no dependencies beyond Go itself. A Postgres-backed implementation would
  satisfy the same interface, backed by the schema in `migrations/0001_init.sql`.
- Cycle detection on `POST /tasks/{id}/dependencies` is a depth-first search over the existing
  dependency edges, done before the edge is added, not a database constraint -- Postgres can't
  express "no cycle of any length" as a `CHECK`.
- Errors use one envelope shape everywhere: `{"error":{"code":"...","message":"..."}}`.

## Not done, and why

- No auth. Out of scope for a task-graph API demo; a real service would put this behind the
  same session/JWT middleware as the rest of the product.
- No status-update endpoint (`PATCH /tasks/{id}/status`). The exercise scope stopped at
  dependencies and readiness; adding it is a five-minute follow-up using the same handler
  shape as `createTask`.
- No pagination on `GET /projects/{id}/tasks`. Fine at demo scale; would need a keyset cursor
  before a project has thousands of tasks.
