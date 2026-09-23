**Time target: 25 minutes.**

Build `TaskBoard`, backed by the `@server/todos` fake API (`getTodos`, `addTodo`,
`toggleTodo` — treat a todo's `done` boolean as its status: done or not done). This is the
optimistic-UI drill: the interviewer wants to see the update appear before the network call
returns, and disappear cleanly if it fails.

## Requirements

- Load tasks on mount with `use`/Suspense or a plain `useEffect` — either is acceptable.
- Toggle a task's status through a **form action** that uses `useOptimistic`, so the flipped
  state renders immediately, before `toggleTodo` resolves.
- If the server call fails, roll back to the pre-toggle state and show an inline error.
- While a toggle is pending, disable **only that row's** button — not the whole board. (Hint:
  `useFormStatus`, scoped by wrapping each row in its own `<form>`.)
- Add a task with `useActionState`: show pending text on the submit button while it's in
  flight, and clear the input after a successful add.
- Put toggle errors and the add form's validation error in a single `aria-live="polite"`
  region, so a screen reader user hears about failures without moving focus.

## Interviewer follow-ups

1. Click a toggle button on a slow connection — does the row flip immediately, or does it
   wait for the server?
2. Force the server to fail — does the UI go back to the correct prior state, or does it get
   stuck showing the optimistic value?
3. With one row's toggle in flight, can I still click a different row's toggle, or Add another
   task?
4. What's the difference between disabling the row's button via `useFormStatus` and disabling
   it with a piece of state you set and clear yourself?
5. Why put the optimistic update inside the action function itself instead of calling it from
   the `onClick` before the form submits?
