# Convert `TextField` to ref-as-prop, and expose a real API

`TextField` is written with `forwardRef`, and its ref just forwards the raw `<input>` DOM node. The "Focus and select" button only calls `.focus()` on it — it was never taught how to select the text, and adding that from outside means reaching into the DOM node's `selectionStart`/`selectionEnd` from a component that shouldn't need to know that much about how `TextField` renders its input.

Rewrite it as React 19 idiom instead:

1. Drop `forwardRef`. Accept `ref` as an ordinary prop on `TextField`.
2. Use `useImperativeHandle` so the ref exposes a small, deliberate API — `{ focusAndSelect(): void }` — instead of the raw DOM node.
3. Update `App` so the button calls that method through the ref.

The button's behavior is what's graded: clicking it should focus the input and select its entire current value, and it should keep working after the user retypes the value.
