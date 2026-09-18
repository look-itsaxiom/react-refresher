`Select` is hard-coded to `Plan`, and its `<select>` never calls `onChange` at all —
picking an option does nothing downstream.

Make `Select` generic over the item type `T`:

```ts
type SelectProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  onChange: (item: T) => void;
  placeholder?: string;
};
```

Wire up the `<select>`'s `onChange` handler: when the user picks an option, find the
matching item in `items` by comparing `getKey(item)` to the DOM event's
`event.target.value`, and call the `onChange` prop with that **whole item** — not the
raw string value React handed you. `App` already expects a full `Plan` object back;
`selected.seats` needs to work once you're done.

The `plans` table is checked with `satisfies Plan[]` on purpose: it keeps each entry's
literal `id` string (`'starter'`, `'team'`, ...) available to TypeScript while still
verifying every entry matches the `Plan` shape. Leave its declaration as-is.
