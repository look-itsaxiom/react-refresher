This card component is themed the way a lot of real code still is: colors hardcoded
directly in the inline `style`. The "Toggle theme" button updates a `theme` state
variable, but nothing reads it — flipping it does nothing visible, and there is no way
to theme this card without writing a second copy of it.

Fix it using CSS custom properties, the same pattern `src/index.css` uses for this whole
app's `data-theme` toggle:

1. Render `data-theme={theme}` on a wrapper element that contains both the `<style>` tag
   and the card (a `<div>` around everything already there works).
2. Inside the existing `<style>` tag, define `--card-bg` and `--card-fg` for
   `[data-theme="light"]` and again for `[data-theme="dark"]`, with different color
   values for each.
3. Change the card's inline `style` so `backgroundColor` and `color` read
   `var(--card-bg)` and `var(--card-fg)` instead of literal hex values.

Do not remove the `data-testid="card"` attribute, the "Toggle theme" button, or its
`onClick` handler — they're used to drive and check the theme switch. You do not need
`useEffect`; this is pure CSS variable scoping plus one attribute.
