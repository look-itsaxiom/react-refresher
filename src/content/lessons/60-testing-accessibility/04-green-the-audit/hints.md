Start with the audit's `violations` list rather than guessing — each entry names a rule and
points a `selector` at the exact offending element. Fix one, re-check, repeat.

---

The image and the icon-only button need the same category of fix: something isn't there to give
them a name. `alt="Jordan Lee"` on the photo gives it one directly. The edit button's only child
is an `<img alt="">` (correctly decorative — it contributes nothing), so the button itself needs
`aria-label="Edit profile"`; text content alone won't come from an empty-alt image.

---

The input needs a real `<label>`, not a `placeholder` — add `htmlFor` on the label pointing at an
`id` you set on the input. The heading just needs to not skip a level: `h2` then `h3`, not `h4`.
The two `id="stats"` divs need to each get their own unique id.

---

The Twitter link has the same "child image contributes nothing" situation as the edit button —
give the `<a>` an `aria-label`. Last one: the `aria-hidden="true"` on the wrapper around the
Follow button isn't marking something decorative, it's hiding a real, focusable control from
every screen reader. Delete it.
