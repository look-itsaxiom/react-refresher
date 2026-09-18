Handle the four line types in this order inside the loop, and `continue` as soon as one
matches — a heading line is never also a bullet, and a command line inside the fenced
block should never be re-checked against the bullet or import patterns.

---

For headings, `HEADING_LINE.exec(line)` gives you the `#` run in group 1 (you don't need
it) and the heading text in group 2. Build a fresh `{ heading, rules: [] }`, `push` it to
`sections`, and reassign `currentSection` to point at that same object — later pushes to
`currentSection.rules` then show up in `sections` too, since it's the same reference.

---

`inCommandsSection` should be recomputed every time you open a new section (including
back to `false` when you leave "Commands" for some other heading) — compare
`heading.toLowerCase() === 'commands'`. Reset `inBashBlock = false` whenever a new heading
starts, so a stray unclosed fence in one section can't leak commands into the next.

---

For rules, run `GLOB_RULE.exec(remainder)` where `remainder` is `BULLET_LINE`'s captured
group. If it matches, group 1 is the glob and group 2 is the rest of the text — both need
`.trim()`. If it doesn't match, the whole `remainder` (trimmed) is the rule's `text` with
no `scope` key at all (not `scope: undefined` explicitly needed either way, but don't set
a `scope` key when there was no `[glob: ...]` prefix).

---

Full shape of the loop body, in order: check heading → (if in a Commands section) check
fence-open / fence-close / bash line → check import → check bullet. Each branch ends with
`continue` except you can let the loop naturally end after the bullet check since it's
last.
