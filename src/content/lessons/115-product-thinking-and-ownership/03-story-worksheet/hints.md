Start with labelled-mode detection: split the text into lines, and match each line
against `/^\s*(situation|task|action|result|reflection)\s*:\s*(.*)$/i`. Track which
section you're currently "in" as you walk the lines, and append every following
non-label line to that section's content until the next label appears.

---

Only fall back to cue-mode when **no** label line matched anywhere in the text. In cue
mode, split on blank lines (`/\n\s*\n/`) to get paragraphs, then for each paragraph count
how many cue substrings from each section's list appear (lowercase, `includes`). Assign
the paragraph to the section with the most hits; break ties by section order
(situation, task, action, result, reflection) and skip paragraphs with zero hits
anywhere.

---

`hasNumbers` and `firstPerson` only look at *one* section's content each — the result
section for numbers (`/[\d%]/`), the action section for the `I` vs `we` count
(`(content.match(/\bI\b/g) ?? []).length` vs `(content.match(/\bwe\b/gi) ?? []).length`).
If that section is absent, the field is `false`, not an error.

---

Build `notes` as a list you push onto in a fixed order: one entry per missing section
(situation → reflection), then a word-count note if outside 120–260, then a numbers note
only if the result section exists but lacks a number, then a first-person note only if
the action section exists but reads "we"-heavy. `verdict` is `'ready'` only when every
one of those checks passes — it's easiest to compute after `sections`, `wordCount`,
`hasNumbers`, and `firstPerson` are all known.

---

For the component, store the textarea's value in `useState`, recompute
`scoreStory(text)` on every render (or memoize it), and derive "missing sections" by
filtering `Object.entries(score.sections)` (or a fixed array of the five names) for the
falsy ones. Render the missing-sections list and the notes list only when they're
non-empty — an empty `<ul>` still counts as "rendered a list," so gate on `.length > 0`
before rendering the wrapper, not just the `<li>`s.
