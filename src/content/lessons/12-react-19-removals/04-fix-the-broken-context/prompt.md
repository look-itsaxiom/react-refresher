# Rewire `ThemeProvider` onto modern context

`ThemeProvider`, `ThemedBanner`, and `ThemeStatus` all use the legacy context API:
`static childContextTypes`, `getChildContext`, `static contextTypes`, and `this.context`.
React 19 removed legacy context outright, and removed it silently — none of this throws or
warns, it just never runs. `getChildContext` is never called, so every consumer's
`this.context` is an empty object, and both `ThemedBanner` and `ThemeStatus` fall back to
`'light'` even though `ThemeProvider` was told `theme="dark"`.

Rewrite it on the modern context API:

1. Create one context object above all three components: `createContext<Theme>('light')`.
2. Turn `ThemeProvider` into a function component that renders the context provider around
   its children with the given `theme` value. React 19 lets you render the context object
   directly as the provider (`<ThemeContext value={theme}>`) instead of
   `<ThemeContext.Provider value={theme}>` — either form works here; use whichever you
   prefer.
3. Turn `ThemedBanner` and `ThemeStatus` into function components that read the value with
   `useContext`, and delete the class + `contextTypes` machinery from both.

Once the value actually reaches them, both consumers should report "dark."
