Split on `"|"` with `strings.Split`, then `strings.TrimSpace` every field. Check `len(fields)`
is 4 or 5 before you index into it — indexing past the end panics instead of returning
`undefined`.
---
For a wrapped sentinel error, `fmt.Errorf("%w: invalid status %q", ErrMalformed, statusField)`
is enough — `errors.Is` walks the chain checking identity against `ErrMalformed`, it doesn't
compare strings. You can wrap again in `ParseTasks` (`fmt.Errorf("line %d: %w", n, err)`) and
`errors.Is` still finds `ErrMalformed` at the bottom of the chain.
---
`bufio.NewScanner(r)` gives you one line per `Scan()` call via `scanner.Text()`; count lines
yourself as you go so you can report which one failed.
---
For `GroupByStatus`, build each bucket with `append` starting from a `nil` slice
(`groups[status] = append(groups[status], task)`) rather than trying to slice into `tasks`
directly — `append` onto a `nil` slice always allocates its own backing array, so the result
can never alias the input.
