The search box below filters a list of fruit as you type. Right now it filters on every
keystroke, which is fine for ten items and a disaster for ten thousand.

Implement `useDebouncedValue`:

```ts
function useDebouncedValue<T>(value: T, delayMs: number): T
```

It should return `value`, but only once `value` has stopped changing for `delayMs` milliseconds.
While the caller is still typing, it keeps returning the previous, "settled" value. Use it in
`App` so the input stays instantly responsive but the list only re-filters after the user pauses.

Don't change the input's behavior — it should still update on every keystroke. Only the filtered
list should lag behind.
