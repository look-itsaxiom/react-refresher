`StatusBadge` is supposed to show the current theme, and the toggle button in the header is supposed to control it. Right now neither works: `Sidebar` and `StatusBadge` were written to take no props (and they shouldn't take any — they're not supposed to know where the theme comes from), so `StatusBadge` has nothing to render.

Fix it with context, not more props:

1. Create a `ThemeContext` with `createContext`.
2. In `App`, provide the current theme and a toggle function through it. Render the context directly as the provider (`<ThemeContext value={...}>`), not `<ThemeContext.Provider>`.
3. In `ThemeToggle` and `StatusBadge`, read the value with `use(ThemeContext)`.
4. Remove the now-unnecessary `theme`/`onToggle` props from `Header`, `ThemeToggle`, and `StatusBadge`'s signatures — they should get everything from context.

When you're done, `StatusBadge` should always show the current theme, and clicking the button should flip both the badge and the button's own label.
