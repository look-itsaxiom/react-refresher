# Roving tabindex toolbar

`FormattingToolbar` renders five formatting buttons (Bold, Italic, Underline, Strikethrough, Code) followed by a text input. Right now every button has `tabindex="0"`, so Tab walks through all five of them one at a time before reaching the input — five stops for what should be one.

Rebuild it using the APG toolbar pattern (roving `tabindex`): the toolbar is a single stop in the page's Tab order, and arrow keys move among its buttons.

1. **Exactly one button has `tabindex="0"`** at any time — the "active" one. Every other button has `tabindex="-1"`. Start with the first button (Bold) active.
2. **`ArrowRight`/`ArrowLeft`** move the active button one step right/left, wrapping around at both ends (past the last button goes to the first, and back past the first goes to the last).
3. **`Home`/`End`** jump straight to the first/last button.
4. **Moving with arrow keys also moves real DOM focus** to the newly-active button (this is what makes it "roving tabindex" rather than `aria-activedescendant` — see concept 2).
5. **Tab leaves the toolbar entirely**, landing on the text input next — it should never visit more than one button.
6. **The active button is remembered when focus leaves and comes back.** If Bold is active, arrow-right to Underline, tab away, then Shift+Tab back into the toolbar — focus should land on Underline (the last-active button), not reset to Bold.
7. **Each button toggles its own pressed state on click**, reflected with `aria-pressed`, independent of which one is "active" for `tabindex` purposes — pressing a button doesn't move the active/tabindex position.

You can manage which index is "active" with component state; just make sure the `tabindex` values and real focus always agree with it.
