**Time target: 25 minutes.**

Build `TaskTable` for a 5,000-row task list — the kind of scale a real hardware program's
task list hits once every part, subassembly, and test step is tracked. This is a performance
prompt as much as a correctness one.

## Requirements

- `data.ts` exports `TaskRow = { id, title, status: 'todo' | 'in-progress' | 'done', dueDate }`
  and a fixture array `rows` of 5,000 rows, generated once at module load. Don't edit `data.ts`.
- A filter input (`aria-label="Filter by title"`) that narrows rows by a case-insensitive
  match on title. Use `useDeferredValue`, not `setTimeout` — there's no network call here, so
  a debounce hook is the wrong tool; you want React to keep the input itself responsive while
  it coalesces the expensive re-render.
- Three sortable columns — title, status, due date — each a `role="columnheader"` with
  `aria-sort` (`"ascending"`, `"descending"`, or `"none"`) reflecting the active sort, toggling
  direction on repeated clicks.
- **Windowed rendering**: only the rows near the current scroll position (plus a small
  overscan buffer) should exist in the DOM — not all 5,000. Hand-roll this: a fixed row
  height, a scrollable container with an `onScroll` handler, and `scrollTop` math to compute
  which slice of the (filtered, sorted) rows to render. No virtualization library.
- A status summary (`todo` / `in-progress` / `done` counts) that reflects the full filtered
  set, not just the rows currently in the DOM.
- An empty state when the filter matches nothing.

## Interviewer follow-ups

1. With 5,000 rows loaded, how many row elements actually exist in the DOM right now?
2. Why `useDeferredValue` here instead of a debounced `setTimeout`? What's the actual
   difference in behavior, not just in code size?
3. If I sort by due date and then scroll, does the windowing stay correct?
4. What happens if I filter down to zero rows?
5. Where would this design break down — what's the row count where hand-rolled windowing like
   this stops being a good idea and you'd reach for a library instead?
