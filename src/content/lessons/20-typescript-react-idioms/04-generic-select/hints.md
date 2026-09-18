`function Select<T,>({ ... }: SelectProps<T>)` — the trailing comma after `T` in a
`.tsx` file tells the parser this is a generic type parameter, not the start of a JSX
element.
---
Inside the `<select>`'s `onChange`, use `items.find((item) => getKey(item) ===
event.target.value)`. The DOM always gives you a string, so compare it against
`getKey(item)`, which you've already used as each `<option>`'s `value`.
---
`find` returns `T | undefined` — only call `onChange` when it actually finds something:
`const item = items.find(...); if (item) onChange(item);`. Every value the `<select>`
can produce came from one of your own `<option>`s, so this is just a defensive check,
not a real edge case to design around.
