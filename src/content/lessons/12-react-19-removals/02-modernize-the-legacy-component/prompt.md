# Fix the badge that forgot its default role

`UserBadge` was written for an older React. It validates its `name` prop with a
hand-rolled `propTypes` object and sets a fallback for `role` with `defaultProps`. Both are
dead code under React 19: nothing calls the validator, and nothing reads `defaultProps` on a
function component anymore. The visible symptom is in the roster — every member who doesn't
have an explicit role should show up as "Member," and right now they show up with no role at
all.

Fix it the React 19 way:

1. Delete `UserBadge.propTypes` — there's nothing left to validate it and no package to
   validate it with.
2. Delete `UserBadge.defaultProps` and give `role` a default value with an ES6 default
   parameter in the function's own signature instead.

Grading only cares about what actually renders: every member without an explicit role should
display "Member," and members with a role keep showing that role.
