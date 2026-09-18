This cart mirrors two values into state via effects, and both mirrors cause an extra render.

1. `CartTotal` computes `total` in a `useEffect` and stores it in state. It renders twice for every prop change: once with the stale total, once after the effect corrects it.
2. `NoteEditor` resets its draft `note` in a `useEffect` keyed on `customerId`. Same shape of bug: a full render with a stale note, only fixed up a beat later by the effect.

Fix both. `CartTotal`'s total should be computed straight from `items` — no state or effect involved. `NoteEditor` should never need to reset its own state; give it something in the parent that changes identity when the customer changes instead.

Leave the JSX inside `CartTotal` and `NoteEditor` alone. The hidden `data-testid="cart-renders"` / `data-testid="note-renders"` spans are how the checks catch the extra render — they're not something to remove.
