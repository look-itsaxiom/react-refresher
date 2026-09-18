# Fix the tabs that lose your draft

`App` renders a two-tab layout: a Notes tab with a draft textarea, and a Tasks tab. Switching tabs conditionally renders one panel or the other, so switching away from Notes unmounts it — and switching back gives you a brand-new `NotesPanel` with an empty draft.

Fix it with `<Activity>`:

1. Always render **both** `<NotesPanel />` and `<TasksPanel />` — stop conditionally rendering only the active one.
2. Wrap each panel in its own `<Activity>`, with `mode="visible"` for the active tab and `mode="hidden"` for the inactive one.
3. Keep the `data-testid="panel-notes"` and `data-testid="panel-tasks"` wrapper elements exactly where they are — the checks look for them.

When you're done: typing a draft in Notes, switching to Tasks, and switching back should show the draft exactly as you left it. Only the active tab's panel should actually be visible at any time.
