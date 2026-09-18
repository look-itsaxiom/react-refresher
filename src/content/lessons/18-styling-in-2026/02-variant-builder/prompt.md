This sandbox has no Tailwind pipeline, so you can't see utility classes rendered — but
you can build the function that *produces* the class string, which is the part
`cva`/`tailwind-variants` actually automate. That function is plain, testable logic.

`button()` below already picks the right class string for a given `intent` and `size`,
but it has two gaps:

1. **No compound variant.** A destructive action at large size (`intent: 'danger'`,
   `size: 'lg'`) should stand out further: add `'ring-2 ring-red-300'` to the result only
   when both of those are true together.
2. **No conflict resolution.** `mergeClasses` currently just concatenates every class list
   with a space. That means if a caller passes `className="p-8"` to override the default
   padding, the result contains *both* the size's `p-3` and the caller's `p-8` — and in a
   real stylesheet, whichever rule happens to come later in the compiled CSS wins, not
   whichever one expresses the caller's intent. Fix `mergeClasses` so that when two classes
   in the same utility *group* appear, the later one replaces the earlier one instead of
   sitting alongside it. For this exercise, only one group matters: padding shorthand,
   i.e. any class matching `p-<value>` (like `p-2`, `p-8`) conflicts with every other
   `p-<value>` class. Classes outside that group (`bg-accent`, `text-sm`, `rounded-md`,
   `ring-2`, ...) never conflict with anything and should all survive, in the order they
   were passed to `mergeClasses`.

Do not change the function signatures, the `Intent`/`Size` types, or `intentClasses`/
`sizeClasses`. `Button` and `App` are already wired up to call `button()` — you shouldn't
need to touch them.
