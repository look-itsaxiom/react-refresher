Start with the shell: replace `<div className="pricing-grid">` with `<table>`, and add
`<caption>Pricing plans</caption>` as its first child. A table's accessible name comes from its
`<caption>`, not from any heading you put near it.
---
Turn the fake header row into `<thead><tr><th scope="col">Plan</th><th scope="col">Seats</th>
<th scope="col">…Price…</th></tr></thead>`, and wrap the data rows in `<tbody>`, one `<tr>` per
plan.
---
Inside each data `<tr>`, the plan name is a `<th scope="row">`, not a `<td>` — it's what `Seats`
and `Price` in that row are *about*. `Seats` and `Price` stay `<td>`.
---
For the sort state, add `useState<'ascending' | 'descending'>('ascending')` and put
`aria-sort={direction}` directly on the Price `<th>`. Sort a copy of the array
(`[...plans].sort(...)`) by `price`, ascending or descending depending on `direction`, and map
over the sorted copy instead of the original `plans` array.
---
The click target goes on a `<button>` nested inside the Price `<th>`, not on the `<th>` itself.
Clicking it should flip `direction` between `'ascending'` and `'descending'` — that one state
flip drives both the `aria-sort` value and which way `.sort()` orders the rows.
