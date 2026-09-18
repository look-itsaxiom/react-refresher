`UserBadge.propTypes` and `UserBadge.defaultProps` are both read by nothing in React 19 — you can delete the whole `propTypes` assignment outright, it was only ever dead validation code in this sandbox anyway (there's no `prop-types` package to import here even in a real app).
---
Move the default out of `defaultProps` and into the destructured parameter list: `function UserBadge({ name, role = 'Member' }: UserBadgeProps)`.
---
Once `role` has a real default in the function signature, every caller that omits `role` (or passes `undefined` explicitly) gets `'Member'` — you don't need to touch how `App` calls `UserBadge` at all.
