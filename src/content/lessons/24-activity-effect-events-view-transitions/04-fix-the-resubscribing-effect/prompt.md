# Stop the chat room from reconnecting on every theme toggle

`ChatRoom` opens a (fake) connection in an effect and logs every incoming message, tagged with the current theme. The effect lists `theme` as a dependency so the logged tag is always current — but that means toggling the theme tears down and recreates the connection every time, even though the room itself hasn't changed.

Fix it so:

1. The connection is created **once**, and only re-created if `roomId` actually changes (it never does in this exercise, but the effect's dependency array should reflect the truth: `roomId` is reactive, `theme` is not).
2. Incoming messages are still logged with whatever the **current** theme is at the moment the message arrives — not the theme from whenever the connection was first opened.

Use `useEffectEvent` to read the latest `theme` inside the message handler without making the effect depend on it.
