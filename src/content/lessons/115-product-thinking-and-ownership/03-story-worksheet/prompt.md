**Time target: 25 minutes.**

Build a worksheet that scores a behavioral-interview story against the rules from the
last two steps, and a question bank you can prioritize by the kind of role you're
interviewing for.

## `scoreStory(text: string)`

Return an object:

```ts
{
  sections: { situation: boolean; task: boolean; action: boolean; result: boolean; reflection: boolean };
  wordCount: number;
  hasNumbers: boolean;
  firstPerson: boolean;
  verdict: 'ready' | 'needs-work';
  notes: string[];
}
```

**Detecting sections — two modes:**

1. **Labelled mode.** If the text contains a line starting with one of `Situation:`,
   `Task:`, `Action:`, `Result:`, `Reflection:` (case-insensitive, optional surrounding
   whitespace), that label's section is present. Everything from that label to the next
   label (or the end of the text) is that section's content.
2. **Cue mode.** If no labels are found anywhere, split the text into paragraphs on
   blank lines. Score each paragraph against five cue-keyword lists (case-insensitive
   substring match) and assign it to whichever section has the most hits — situation
   wins ties, then task, action, result, reflection, in that order. A paragraph with
   zero hits against every list is unassigned. A section is present if at least one
   paragraph was assigned to it; its content is the assigned paragraphs joined together.

   Cue lists (use exactly these, all lowercase, matched as substrings):
   - situation: `situation`, `at the time`, `we were`, `the team was`, `context`,
     `background`, `a customer`, `a project`, `joined`
   - task: `task`, `my job`, `i was asked`, `needed to`, `goal was`, `responsible for`,
     `assigned`
   - action: `so i`, `i decided`, `i built`, `i wrote`, `i proposed`, `i talked to`,
     `i reached out`, `i pushed`, `i pulled`, `i shipped`, `i ran`, `i designed`
   - result: `as a result`, `we shipped`, `reduced`, `increased`, `result was`,
     `outcome`, `we saw`, `%`, `cut `, `improved`
   - reflection: `next time`, `in hindsight`, `looking back`, `i would`,
     `i'd do differently`, `lesson i`, `what i learned`

**Other fields:**

- `wordCount` — whitespace-separated word count of the whole text.
- `hasNumbers` — `true` if the **result section's content** contains a digit or a `%`.
  `false` if there is no result section.
- `firstPerson` — `true` if the **action section's content** has more standalone `I`
  matches (`\bI\b`) than standalone `we`/`We` matches (`\bwe\b`, case-insensitive).
  `false` if there is no action section.
- `verdict` — `'ready'` only if all five `sections` are `true`, `wordCount` is between
  120 and 260 inclusive, `hasNumbers` is `true`, and `firstPerson` is `true`. Otherwise
  `'needs-work'`.
- `notes` — one plain-language string per failing rule (missing sections named
  individually, word count out of range, no number in the result, "we"-heavy action).
  Empty when `verdict` is `'ready'`.

## `questionsFor(role)`

```ts
questionsFor(role: { team: 'small' | 'large'; product: string; onCall: boolean }): string[]
```

Return a prioritized list (most important first) drawn from this bank, always including
at least the first two:

1. How do different roles see different views of the same {product}?
2. How does a change get from a PR to production?
3. What does the on-call rotation look like? — only if `role.onCall` is true; otherwise
   substitute "How does the team find out when something breaks in production?"
4. How do product decisions get made on a team this size? — reword "team this size" to
   name `role.team` (`"small"` → "on a small team", `"large"` → "on a team this large").
5. What's the hardest coordination problem a customer has brought you?

## `<StoryWorksheet>`

- A labelled `<textarea>` for the story text (`<label>` wraps it or uses `htmlFor`).
- A live score panel below it, updating as the learner types, showing: the verdict text
  (`Ready` / `Needs work`), the word count, a list of any missing sections (empty list =
  render nothing there, not an empty `<ul>`), and the `notes` as list items.
- A `<details>` element titled "Prompts" listing the eight story prompts from the last
  concept step as list items.
