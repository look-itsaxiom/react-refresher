# Finish the API

This is a take-home skeleton: `store.go` (a complete `Store` interface and `MemStore`) and
`server.go` (a `net/http` server) for a small project-tasks API. `GET`/`POST
/projects/{projectID}/tasks` are already wired and working. Two routes are stubbed with a
`501 Not Implemented` and TODO comments -- finish them:

## `POST /tasks/{id}/dependencies`

The path's `{id}` is the **successor** (the task that has to wait); the JSON body names the
**predecessor**:

```json
{ "predecessorId": "t1" }
```

Implement `addDependency`:

1. Decode the body. If it fails to decode, or `predecessorId` is empty, respond `400` with
   the error envelope: `{"error":{"code":"invalid_body","message":"..."}}`.
2. Call `store.AddDependency(r.Context(), body.PredecessorID, r.PathValue("id"))`.
3. Translate the result:
   - `nil` -> `204 No Content`, empty body.
   - `errors.Is(err, ErrNotFound)` -> `404`, code `"not_found"`.
   - `errors.Is(err, ErrCycle)` -> `409 Conflict`, code `"cycle"`.
   - anything else -> `500`, code `"internal_error"`.

`MemStore.AddDependency` (in `store.go`, already implemented) does the cycle check itself,
by depth-first search over the existing dependency edges -- you don't write the graph walk,
just wire its result to the right status code.

## `GET /projects/{projectID}/ready`

A task is "ready" if it isn't already `done` and every task it depends on is `done`.
`MemStore.Ready` already computes this. Implement `readyTasks`:

1. Call `store.Ready(r.Context(), r.PathValue("projectID"))`.
2. Write the result as `200` JSON, the same way `listTasks` does -- an empty list, not
   `null`, when there are none.

## What you have to work with

`writeJSON` and `writeError` are already defined for you and used by the two working
handlers -- reuse them. Look at `listTasks` and `createTask` in `server.go` for the pattern
both TODOs follow.

The non-Go files in this folder (`migrations/0001_init.sql`, `docker-compose.yml`,
`github-workflows/ci.yml`, `README.md`) are read-only reference material for the next
concept step -- nothing in them is graded here.
