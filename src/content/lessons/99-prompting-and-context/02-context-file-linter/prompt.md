A `CLAUDE.md` (or `AGENTS.md`) is just Markdown with a shape an agent relies on: headings
group related rules, bullets under a heading are the rules themselves, a `Commands`
heading with a fenced ` ```bash ` block tells the agent how to verify its own work, and
`@path` lines pull in other files on demand. `App.tsx` gives you that shape as a type
(`ContextFile`), a fully-working linter (`lintContextFile`) that already assumes the shape
your parser produces, and one function left to finish: `parseContextFile(markdown)`.

## The shape you're producing

```ts
type Rule = { text: string; scope?: string };
type Section = { heading: string; rules: Rule[] };
type ContextFile = { sections: Section[]; imports: string[]; commands: string[] };
```

Walk the markdown line by line and build this up:

1. **Headings.** A line starting with `#` through `######` followed by a space starts a
   new `Section`. Strip the leading `#`s and surrounding whitespace to get `heading`.
   Lines before the first heading don't belong to any section — skip them.
2. **Rules.** A line that, once trimmed, starts with `- ` or `* ` is a rule in the
   *current* section (the most recently opened heading). Its text is everything after
   that marker, trimmed.
   - A rule can carry a scope glob as a prefix: `[glob: src/**/*.tsx] rule text`. If the
     rule text (after the bullet marker) matches `^\[glob:\s*([^\]]+)\]\s*(.*)$`, set
     `scope` to the captured glob and `text` to the captured remainder. Otherwise `scope`
     is `undefined` and `text` is the whole trimmed remainder.
3. **Imports.** A line that, once trimmed, is a single token starting with `@` and
   containing no whitespace (matches `^@\S+$`) is an `@path` import. Push the path
   *without* the leading `@` (so `@docs/testing.md` becomes `docs/testing.md`) onto
   `imports`. Imports aren't tied to a section — collect them wherever they appear.
4. **Commands.** Track whether the *current section's heading*, compared
   case-insensitively, is exactly `"commands"`. While it is, watch for a line that's
   exactly ` ```bash ` (opens a fenced block) — once you see it, collect every following
   non-empty trimmed line as a command until a line that's exactly ` ``` ` closes the
   block. Fenced ` ```bash ` blocks under any *other* heading are not commands and should
   be ignored.

`GLOB_RULE` and `IMPORT_LINE` regexes are already defined for you at the top of the file
— use them instead of rewriting the patterns.

## What's already done for you

`lintContextFile(file, packageJson?)` is fully implemented and won't need changes. Read it
before you write the parser — it tells you exactly what shape it expects `ContextFile` to
be in, which is the real spec for `parseContextFile`. It reports:

- `missing-commands` (warn) when `commands` ends up empty.
- `too-long` (info) for any rule whose `text` is over 200 characters.
- `contradiction` (error) when one rule says `always <X>` and another says `never <X>`
  for the same (normalized) `X`, anywhere in the file.
- `secret` (error) for any rule text containing `sk-`, `ghp_`, `AKIA`, or `password=`.
- `too-long-file` (warn) when the total word count across all headings, rule text,
  imports, and commands exceeds 1500 words.
- `stale-fact` (warn), only when a `packageJson` map is passed, when a rule states a
  major version for `react`, `typescript`, or `vite` that doesn't match the major version
  in `packageJson`.

Get the four parsing steps above right and every one of those checks starts working
correctly on real input — nothing in `lintContextFile` needs to change.
