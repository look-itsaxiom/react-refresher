Build `triageTask` as two separate passes, the same way the framework
scorer in lesson 48 split elimination from scoring: first walk every rule
and collect guardrails plus whether it rules out `'delegate'` (and whether
it forces `'manual'`), then decide `mode` once at the end from those two
booleans. Don't try to `return` early from inside the rule checks — every
rule needs a chance to add its own guardrail even if an earlier rule has
already decided the mode.

---

Track two flags while you walk the rules: something like `forceManual`
(only `kind === 'architecture'` sets this) and `ruleOutDelegate` (set by
architecture, security/high-sensitivity, incident, vague spec, and system
blast radius). At the end: `forceManual` wins outright → `'manual'`;
otherwise, if the task also clears the "safe to hand off" checklist in rule
7 of the prompt (right `kind`, has tests, clear spec, low sensitivity,
`!ruleOutDelegate`) → `'delegate'`; otherwise → `'pair'`.

---

`reason` just needs to mention what actually fired — the checks test it
with a case-insensitive substring match (e.g. an architecture task's reason
should contain the word "architecture"), not an exact string. Building an
array of short phrases as you walk the rules and `.join('; ')`-ing it at
the end, the same way you're already building `guardrails`, gets you this
for free — reuse one loop for both.

---

`reviewChecklist` is a straight-line function: five `if`s in the exact
order given in the prompt, each pushing zero or more strings onto a result
array, with the "read the diff" item pushed unconditionally at the very
end. The one easy mistake is looping the dependency check inside another
condition — every entry in `addedDeps` gets its own checklist item, in the
array's original order, regardless of how many other rules also fired.

```ts
export function reviewChecklist(diff) {
  const items = [];
  if (diff.touchesAuthOrPayments) items.push('get a second reviewer for auth or payments code');
  if (diff.filesChanged > 15) items.push('ask for a split');
  for (const dep of diff.addedDeps) items.push(`audit new dependency "${dep}" (lesson 68)`);
  if (diff.testsModified && !diff.testsAdded) items.push('verify tests were not weakened to pass');
  items.push('read the diff line by line before approving');
  return items;
}
```
