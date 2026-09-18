This packing list lets you type a note next to each item and remove items. Try it:

1. Type something into the note field for the **second** row.
2. Remove the **first** row.

The note you typed jumps to whatever item is now second — it does not stay with the item you
typed it next to. The row's own `<input>` keeps its DOM node and internal state because React
is matching children by *position*, not by *item*.

Fix the list so each row's note stays attached to its item no matter what gets added, removed,
or reordered above it. Also add a `data-id={item.id}` attribute to each row's wrapping `<li>` so
the checks (and any real debugging you'd do) can tell which item a row renders without reading
its position.

Do not change `PackingItem`'s shape or the remove/add logic — only how the list is keyed and
rendered.
