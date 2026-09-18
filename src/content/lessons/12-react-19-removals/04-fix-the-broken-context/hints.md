`childContextTypes`, `getChildContext`, and `contextTypes` are all inert in React 19 — nothing calls them, and nothing warns you that nothing is calling them. Every class relying on this trio needs to go.
---
Start with one shared context object, defined once, above (or outside) all three components: `const ThemeContext = createContext<Theme>('light')`.
---
`ThemeProvider` becomes a plain function: `function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) { return <ThemeContext value={theme}>{children}</ThemeContext>; }`. `<ThemeContext.Provider value={theme}>...</ThemeContext.Provider>` works identically if you'd rather write that form.
---
Each consumer collapses to two lines: `const theme = useContext(ThemeContext);` in place of the class and its `contextTypes`, then the same JSX the class was already returning.
