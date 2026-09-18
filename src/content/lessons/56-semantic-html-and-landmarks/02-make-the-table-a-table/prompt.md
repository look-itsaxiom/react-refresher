This pricing grid is built entirely from styled `<div>`s with a fake header row on top. It looks
like a table. It produces none of a table's accessibility tree: no caption, no column headers, no
row headers, and the "sort by price" button doesn't expose any sort state at all.

Rebuild it as a real `<table>`, in `App.tsx`, without changing the plan data or the dollar
formatting:

1. **A real table with a real name.** Replace the outer `<div className="pricing-grid">` with a
   `<table>`, and give it a `<caption>` reading exactly `Pricing plans`. A table's accessible name
   comes from its `<caption>` — not a heading sitting above it.
2. **Column headers.** The fake header row's three cells (`Plan`, `Seats`, `Price…`) become a real
   `<thead><tr>` of `<th scope="col">` cells.
3. **Row headers.** Each row's plan name becomes a `<th scope="row">` instead of a `<td>` — it's
   what the rest of that row's cells are describing, not just another value.
4. **A sortable Price column.** The Price header cell should carry `aria-sort`, set to
   `"ascending"` or `"descending"` to match the current sort order (start ascending). Put a real
   `<button>` *inside* that `<th>` — clicking it flips the sort direction, re-orders the rows by
   price, and flips `aria-sort` to match. An `onClick` directly on the `<th>` doesn't count; the
   `<th>` isn't focusable or keyboard-activatable on its own.

The plans array and its `$NN/mo` formatting are already correct — every fix here is about what
element wraps the data, not the data itself.
