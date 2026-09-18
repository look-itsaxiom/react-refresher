# Trap and return

`Drawer` slides in from the side when "Open settings" is clicked, but it has none of the focus behavior a real drawer needs: opening it leaves focus wherever it was, Tab walks straight past the drawer into the rest of the page, `Escape` does nothing, and the background stays fully reachable while the drawer is supposedly the only thing you should be able to interact with.

This isn't a `<dialog>` — non-modal side panels like this one are exactly the case from concept 2 where you build the trap yourself instead of getting it from `showModal()`. Fix `Drawer` and `App` so that:

1. **Opening the drawer** moves focus to the first focusable element inside it (the "Close" button).
2. **Tab and Shift+Tab cycle within the drawer** while it's open — Tab from the last focusable element wraps to the first, and Shift+Tab from the first wraps to the last. Focus never leaves the drawer via Tab while it's open.
3. **Escape closes the drawer.**
4. **Closing the drawer** (by Escape or the Close button) returns focus to the "Open settings" button that opened it.
5. **While the drawer is open**, the rest of the page (the `<div>` wrapping "Other page action") is marked `aria-hidden="true"` and/or `inert`, and that marking is removed again once the drawer closes.

You can query the focusable elements inside the drawer at runtime (`querySelectorAll('button, input, [href], select, textarea, [tabindex]')` is a reasonable set for this exercise) — don't hardcode which one is "first" or "last".
