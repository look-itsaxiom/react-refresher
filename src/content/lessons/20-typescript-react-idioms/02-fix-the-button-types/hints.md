Start from the types, not the JSX. Define `LinkButtonProps` and `PlainButtonProps` as two
separate object types — each extending `ComponentPropsWithoutRef` of the matching native
element — then union them into `ButtonProps`. Making `href` required on the link branch
and absent from the button branch is what makes them tell apart.
---
Destructure only `variant` (and maybe `className`, if you want to merge it with your own
class name) out of the props in the function signature; leave everything else in a rest
object so you have something to spread later: `function Button({ variant = 'primary',
...props }: ButtonProps) { ... }`.
---
`if ('href' in props) { ... }` narrows `props` to `LinkButtonProps` inside the block and
to `PlainButtonProps` after it — TypeScript can do this because `href` is required in one
branch and missing from the other. Render `<a href={props.href} {...props} />` inside the
narrowed block (destructure `href` out first if you don't want it passed twice), and
`<button type="button" {...props} />` outside it.
