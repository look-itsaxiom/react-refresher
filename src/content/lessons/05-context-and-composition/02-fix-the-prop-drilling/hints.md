`Sidebar` and `StatusBadge` are two levels apart with nothing shared between them except the theme. Passing `theme` back in as a prop to either one defeats the point — reach for `createContext` instead.
---
Create the context once, near the top of the file: `const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>(...)`. Give it a sensible default so the type checker (and any orphaned consumer) has something to work with.
---
Provide the value in `App` by wrapping the tree in the context itself, not `.Provider`: `<ThemeContext value={{ theme, toggleTheme }}>...</ThemeContext>`. Read it in `ThemeToggle` and `StatusBadge` with `use(ThemeContext)`.
---
`Header`, `ThemeToggle`, and `StatusBadge` should end up taking no props at all — every one of them gets what it needs from `use(ThemeContext)` instead of a parameter.
