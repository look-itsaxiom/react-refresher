This FAQ accordion and confirmation modal are both hand-rolled with `useState` and styled
`<div>`s. Replace them with the native elements built for exactly this job.

**Accordion → `<details>`/`<summary>`**

Replace the three FAQ rows (each currently a clickable `<div>` question plus a conditionally
rendered `<div>` answer) with three `<details name="faq">` elements, one per FAQ item:

```html
<details name="faq">
  <summary>Question text</summary>
  Answer text
</details>
```

Keep the same three questions and answers. No `useState`, no click handler — the browser owns
the open/closed state. Give every `<details>` the same `name="faq"` attribute; in a browser that
supports it, this makes the group mutually exclusive (opening one closes the others). This
course's automated grader runs on jsdom, which — as of the version this project pins — does not
implement that exclusivity behavior yet, so the checks only grade that each `<details>` opens and
closes independently when you click its `<summary>`, not that opening one closes another. Include
`name="faq"` anyway; it's free, correct, and is what makes the behavior real once this runs in an
actual browser.

**Modal → `<dialog>`**

Replace the "Delete account" confirmation panel (a fixed-position overlay `<div>` shown by
`useState`) with a real `<dialog>` element, controlled through a ref:

- A "Delete account" button opens it.
- Inside the dialog, render the text `Are you sure?` and a "Cancel" button that closes it.
- Use a `ref` on the `<dialog>` and set its `open` property directly
  (`dialogRef.current!.open = true` / `= false`) to open and close it.

In real projects, prefer `dialogRef.current?.showModal()` and `.close()` over setting `open`
directly — `showModal()` is what gives you the backdrop, the top-layer stacking, and the focus
trap described in the concept step. This exercise grades on the plain `open` property instead
because `showModal`/`close` aren't implemented as callable methods in this project's jsdom-based
grader; the visible behavior (the dialog appearing and disappearing) is identical either way, you
are just opting out of the modal extras that only a real browser can grade.
