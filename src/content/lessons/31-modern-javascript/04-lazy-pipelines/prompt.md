Implement two lazy helpers using iterator helpers, then wire one of them into a small
paginated list.

1. **`paginate<T>(source: Iterable<T>, size: number): Generator<T[]>`** — a generator that
   yields arrays (pages) of up to `size` items pulled from `source`, one page at a time. It
   must pull items from `source` **only as each page is requested** — never eagerly consume
   the rest of `source` inside `paginate` itself. The last page may be shorter than `size`
   if `source` runs out; once `source` is exhausted, the generator is done (no trailing
   empty page).

2. **`pluck<T, K extends keyof T>(source: Iterable<T>, key: K): Iterator<T[K]>`** — lazily
   maps an iterable of objects to just one field, without materializing an array. An
   iterator helper (`.map()`) applied to `source` does exactly this in one line.

3. **`PagedList`** — a small component (already stubbed below `pluck`) that shows the
   current page of `people` (an array of `{ id: string; name: string }`) and a "Load more"
   button. Wire it up: keep the paginator itself in a `useRef` (generators are stateful —
   creating a new one on every render would restart pagination), keep the array of items
   shown so far in state, and on each click pull the next page and append it. Once the
   generator is exhausted, the button should say "No more" and be disabled instead of
   doing nothing silently.

The checks include a source that keeps producing items well past what any page needs — if
your `paginate` or `pluck` tries to convert the whole thing to an array before slicing it
into pages, that check will fail loudly (not hang) once it notices you pulled far more items
than requested.
