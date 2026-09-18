The bug is `{tab === 'notes' ? <NotesPanel /> : <TasksPanel />}` — only one component is ever mounted, so the other one's `useState` is created fresh every time you switch to it. Fixing this means both panels have to stay mounted permanently.
---
Render both panels unconditionally, each wrapped in its own `<Activity mode={...}>`. The `mode` for each one comes from comparing `tab` to that panel's name: `mode={tab === 'notes' ? 'visible' : 'hidden'}` for the Notes wrapper, and the mirror image for Tasks.
---
Import `Activity` from `'react'` alongside `useState`. `<Activity>` takes `children` like any wrapper element — put the existing `<NotesPanel />` / `<TasksPanel />` calls inside it, don't replace them.
---
The full shape: two `<Activity>` elements as siblings (not nested in each other), each with exactly one mode `"visible"` and the other `"hidden"` at any given time, replacing the ternary that used to pick between the two panels.
