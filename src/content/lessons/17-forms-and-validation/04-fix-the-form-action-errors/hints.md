Replace `error: string | null` with `errors: { title?: string; owner?: string }` and add
`values: { title: string; owner: string }` to `State`. Every `return` in `submit` needs to fill
in all three keys of `State`.
---
Do the length and required checks against the raw `formData.get(...)` strings *before* calling
`addTodo` — if either check fails, return immediately with `errors` and `values` set, and skip
the server call entirely. That's the "no round trip for an obviously bad value" rule.
---
`addTodo` still throws `Error('Title is required')` for a blank title after its own trim. Catch
it and put the message on `errors.title`, along with the `values` the user submitted — don't lose
those the way the starter does.
---
Bind `defaultValue={state.values.title}` (and `owner`) on the inputs. Give each error paragraph a
stable `id` (e.g. `title-error`) and set the input's `aria-describedby` to that `id` only while
the error exists; otherwise leave it `undefined` so screen readers don't reference a message
that isn't there.
