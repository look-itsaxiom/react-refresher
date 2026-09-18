Right now `Step2` doesn't exist in the tree at all until `step` becomes `2` — that's why
its lazy `useState` initializer (and the setup cost it carries) only ever runs at the exact
moment the user clicks "Next." To run it earlier, `Step2` needs to be created earlier.

---

Mount both `<Step1 />` and `<Step2 />` at the same time, every render, and wrap each one in
its own `<Activity>` to control which is actually shown: `<Activity mode={step === 1 ?
'visible' : 'hidden'}>`. Do the same for `Step2` with the condition flipped. Import
`Activity` from `react`.

---

The two `<Activity>` elements are siblings inside `Wizard`'s returned JSX — one holds
`Step1`, the other holds `Step2` — each gets its own `mode` based on the current `step`.
Once `Step2` exists (even hidden), its lazy initializer has already run and its state
already holds the result — hiding and showing it again doesn't re-create the component or
re-run the initializer, because `<Activity>` preserves state across visibility changes.
