A component that wants to accept a ref no longer needs `forwardRef` in React 19 — give it a `ref` prop like any other: `function TextField({ label, ref }: { label: string; ref?: React.Ref<TextFieldHandle> })`.
---
Keep the real DOM ref internal to `TextField` (a `useRef<HTMLInputElement>(null)` inside it), and expose only what the parent needs with `useImperativeHandle(ref, () => ({ focusAndSelect() { ... } }))`.
---
`focusAndSelect` needs two calls on the input node: `.focus()` then `.select()`. `HTMLInputElement.select()` selects all of its current text, so you don't need to track the value yourself.
---
In `App`, the ref you pass to `TextField` now points at the handle object (`{ focusAndSelect(): void }`), not an `HTMLInputElement`. Type it as `useRef<TextFieldHandle>(null)` and call `fieldRef.current?.focusAndSelect()` from the button.
