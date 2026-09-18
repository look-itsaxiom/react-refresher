`Leaderboard` below has three separate violations of the rules from the last step. Each one
would make `eslint-plugin-react-hooks`'s compiler rules light up, and each one causes a real
bug independent of whether the Compiler is even enabled:

1. It sorts the `players` array **in place** before rendering, mutating the array the
   parent handed it as a prop.
2. It computes each row's `data-id` with `Math.random()` **during render**, so the id
   changes on every re-render even though the row didn't move.
3. It reads a ref's `.current` **during render** to decide whether to show a compact
   layout — which throws immediately, because the ref is still `null` on the first render
   (nothing has mounted the DOM node yet).

Fix all three without changing what the component looks like to a user: it should still
render a sorted list of players and still adjust its layout once it knows the container's
width.

- For the sort, don't mutate the prop — copy it (`Array.prototype.toSorted`, or spread and
  sort the copy).
- For the id, derive it from something stable (the player's name is unique in this data) —
  don't recompute it on every render.
- For the layout read, measure the container in an effect and keep the result in state;
  don't read `.current` from the component body.
