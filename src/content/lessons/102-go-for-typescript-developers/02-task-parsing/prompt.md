You're parsing a plain-text export of a project's task list — one task per line, fields
separated by `|`:

```
PROJ-12 | Ship the vendor import | 3h30m | todo | PROJ-3,PROJ-7
```

ID, title, estimate (a Go duration string), status, and an optional comma-separated list of
task IDs this task depends on.

Implement, in `tasks.go`:

- **`ParseTaskLine(line string) (Task, error)`** — parse one line into a `Task`. The
  dependency field is optional (a line can have 4 or 5 `|`-separated fields). Any structural
  problem — wrong field count, an empty ID or title, a duration `time.ParseDuration` can't
  parse, a status that isn't `todo`, `in-progress`, or `done` — must return an error that
  `errors.Is(err, ErrMalformed)` reports as true. `ErrMalformed` is already declared for you;
  wrap it with `fmt.Errorf("%w: ...", ErrMalformed, ...)` rather than returning a new error.
- **`ParseTasks(r io.Reader) ([]Task, error)`** — read one task per line from `r`. Skip blank
  lines and lines starting with `#`. On a parse failure, the returned error must name the
  1-based line number (e.g. its message should contain `"line 3"`) and still satisfy
  `errors.Is(err, ErrMalformed)`.
- **`TotalEstimate(tasks []Task) time.Duration`** — sum every task's `Estimate`.
- **`GroupByStatus(tasks []Task) map[Status][]Task`** — bucket tasks by `Status`, keeping each
  bucket's tasks in the same relative order they appeared in the input. The returned slices
  must be independent of the input: appending to a returned group must never change the slice
  you passed in.

Run the tests locally with the command shown on the left, or click **Run go test**.
