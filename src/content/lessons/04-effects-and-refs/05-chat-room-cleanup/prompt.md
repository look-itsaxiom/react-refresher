`App` connects to a chat room on mount but never disconnects, and it treats `notify` as if it were a reactive value.

1. Click **Switch room** and the old connection is never closed: `room.subscriberCount` keeps climbing instead of settling back to 1.
2. Click **Bump**, which only touches unrelated state, and the effect reconnects anyway, because `notify` is a brand new function on every render and the effect lists it as a dependency.

Fix the leak with a cleanup function. Fix the second bug by pulling the non-reactive part of the effect (calling `notify`) out with `useEffectEvent`, so the effect's only real dependency is `roomId`.

Don't rename `room`, `connectToRoom`, or the `data-testid="room"` element — the checks read them directly.
