Each `Row` owns its own `note` state via `useState`. React decides whether to reuse that state
by matching `key`, not by matching `item`. What is `key` set to right now, and does that value
survive a removal above it?
---
Switch the key from the map index to `item.id`. You'll also need to stop removing by index
(`filter((_, i) => i !== index)`) since the index closures capture a position that shifts —
filter by the item's `id` instead, and pass each row's own id to its remove handler.
---
The remove button needs `item.id` at the moment it's clicked, not the index at render time.
Capture it in the closure: `onRemove={() => removeItem(item.id)}`. Add `data-id={item.id}` to
the `<li>` alongside the key change.
