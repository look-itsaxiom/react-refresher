The dependency array `[theme]` is the whole bug: it makes the effect re-run (disconnecting the old connection and opening a new one) on every theme toggle, even though nothing about the room connection itself depends on the theme.
---
Pull the part that reads `theme` out into its own function created with `useEffectEvent`: `const onMessage = useEffectEvent((message: string) => { setLog((prev) => [...prev, \`[${theme}] ${message}\`]); });`. Call `onMessage` is safe to define outside the effect — `useEffectEvent` gives it a stable identity.
---
Change the effect's dependency array to `[]` (or `[roomId]` if you generalize it) and, inside the effect, register the connection's message handler as `connection.onMessage((message) => onMessage(message))`. The effect body no longer reads `theme` directly, so it no longer needs to list it — and no longer needs to reconnect when it changes.
---
Import `useEffectEvent` from `'react'` alongside `useState` and `useEffect`. Remember: only call the function it returns from inside an effect (or an effect's own callback) — never from a render body or pass it down as a prop.
