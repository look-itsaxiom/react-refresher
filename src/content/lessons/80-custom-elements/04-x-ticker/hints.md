Add a `disconnectedCallback()` method — the starter doesn't have one at all. It needs to undo
exactly the two things `connectedCallback` sets up: the interval and the resize listener.
---
Store the interval id and the `AbortController` as private fields, and null them out right after
cleaning each one up (`this.#intervalId = undefined; this.#controller = null;`). That's what makes
disconnecting twice in a row safe — the second call sees nothing to clean up and does nothing.
---
Create a fresh `AbortController` at the top of `connectedCallback`, and pass `{ signal: this.#controller.signal }`
as the options object to `window.addEventListener('resize', ..., { signal })`. One `abort()` call
in `disconnectedCallback` removes that listener — you don't need to keep a reference to the
handler function or call `removeEventListener` yourself.
---
For the interval: `this.#intervalId = window.setInterval(() => { ... }, 20);` in
`connectedCallback`, then `window.clearInterval(this.#intervalId);` in `disconnectedCallback`
(guarded so it's a no-op if there's no id stored).
