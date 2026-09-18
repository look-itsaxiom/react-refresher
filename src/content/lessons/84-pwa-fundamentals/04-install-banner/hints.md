Check the rules in the order they're listed. `displayMode !== 'browser'` and
`storage.get('install-dismissed')` are both unconditional early returns — neither cares
what `promptEvent` or `isIOS` are.
---
For the "no prompt" branch, `isIOS` only matters when `promptEvent` is `null`. If a prompt
*is* available, render the Install button regardless of `isIOS` — a real Chromium browser
on an iPad-shaped device could still capture the event in principle, and the rule is about
what's actually available, not about the platform.
---
The click handler is async: call `promptEvent.prompt()` and `await` it, then `await
promptEvent.userChoice` to get `{ outcome }`. Do the `storage.set('install-dismissed',
true)` and `onOutcome(outcome)` calls for *both* `'accepted'` and `'dismissed'` — nothing
in the rules branches on which outcome it was.
---
"Hides itself" needs to survive a re-render, not just this click. Local component state
(`useState`) is enough to hide the button within the same mounted instance, but the
`storage.get('install-dismissed')` check at the top is what makes a *fresh* render (a new
instance, same `storage` object) also render nothing — that's why the storage write has to
happen even though you also have local state.
