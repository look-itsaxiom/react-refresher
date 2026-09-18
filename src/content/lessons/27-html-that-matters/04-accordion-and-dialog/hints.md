For the accordion, delete `openIndex` entirely — `<details>`/`<summary>` track their own open
state in the DOM. Map over `FAQS` and render `<details name="faq"><summary>{faq.question}</summary>{faq.answer}</details>`
for each one, with no `onClick` at all.
---
For the dialog, keep a `useRef<HTMLDialogElement>(null)` and put it on the `<dialog>` element.
The "Delete account" button's `onClick` should set `dialogRef.current!.open = true`; the
"Cancel" button inside the dialog should set `dialogRef.current!.open = false`. Delete the
`confirmOpen` state and the overlay `<div>`s — the `<dialog>` element is the overlay.
---
Remember `dialogRef.current` can be `null` before the first render commits the ref, so guard the
assignment: `if (dialogRef.current) dialogRef.current.open = true;`. The dialog only needs to
exist once in the JSX — it doesn't need to be conditionally rendered the way the old overlay
`<div>` was; toggling `open` is what shows and hides it.
