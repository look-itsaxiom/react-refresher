`ProfileCard` renders fine and looks fine. It also has seven distinct accessibility violations,
graded by the same kind of audit you just built — a complete, correct `auditA11y` is wired into
the checks for this exercise, run against your component mounted inside a `<main>` landmark (the
way it would actually sit on a real page).

Fix `ProfileCard` until:

1. The audit reports **zero violations**.
2. These real Testing Library queries all succeed against the rendered component:
   - `getByRole('img', { name: 'Jordan Lee' })`
   - `getByRole('button', { name: 'Edit profile' })`
   - `getByRole('button', { name: 'Follow' })`
   - `getByLabelText('Display name')`
   - `getByRole('link', { name: 'Jordan Lee on Twitter' })`

You don't need to change the component's structure or its visual output — every fix here is
either an attribute (`alt`, `aria-label`, `htmlFor`/`id`) or removing one that's actively wrong
(a stray `aria-hidden="true"`, a duplicated `id`, a heading level that jumps too far). Read
through the component for:

- an image with no accessible name for a screen reader,
- an icon-only button with no accessible name,
- a text input relying on a placeholder instead of a real label,
- a heading level that skips one,
- two elements sharing the same `id`,
- a link with no accessible name,
- and a real, focusable button that a decorative wrapper has hidden from assistive tech
  entirely — which the `getByRole('button', { name: 'Follow' })` query above will refuse to find
  until it's fixed, the same way a screen reader would refuse to reach it.
