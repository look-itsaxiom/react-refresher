`App.tsx` gives you two finished pieces and one to complete. `estimateTokens(text)` is the
rough chars-÷-4 approximation this course's own budgeting relies on. `planContext(task,
repo, budget)` is a fully worked context-budget planner: it walks a repo's files in a
documented priority order (spec files that mention a task keyword, then the task's changed
files, then those files' tests by naming convention, then docs mentioning a keyword, then
other source files by keyword hits), skips lockfiles and generated files outright, and
stops adding files once the budget runs out — read it, it's the reference for the "what to
include per task" idea from the concept step just before this. Your job is
`reviewRubric(pr)`: turn a small PR summary into a score and a list of blockers and
questions, the way a human reviewer would triage an AI-written diff before reading a line
of code.

## The type you're scoring

```ts
type PullRequest = {
  spec: string[];          // spec items the task asked for
  implemented: string[];   // spec items the PR actually implements
  testsAdded: string[];
  testsChanged: string[];
  deps: string[];          // new dependencies this PR adds
  filesTouched: number;
  usesDeprecated: string[]; // deprecated API names used, e.g. "forwardRef"
};
```

## What `reviewRubric` returns

`{ score: number; blockers: string[]; questions: string[] }`, starting `score` at 100 and
applying these, in any order (they're independent):

1. **Unimplemented spec items are blockers.** For every entry in `pr.spec` that does not
   appear in `pr.implemented`, push a blocker message naming it and subtract 15 from the
   score.
2. **Deprecated APIs are blockers with the React 19 replacement.** For every entry in
   `pr.usesDeprecated`, push a blocker that names the API *and* what replaces it in React
   19, and subtract 20 from the score. Use these exact replacements:
   - `forwardRef` → ref is a normal prop in React 19; drop `forwardRef` and accept `ref`
     directly.
   - `propTypes` → no longer read from function components in React 19; use TypeScript
     prop types instead.
   - `ReactDOM.render` → removed in React 19; use `createRoot` from `react-dom/client`.
   For any other deprecated name, still push a blocker (a generic "check the React 19
   migration guide" message is fine) and still subtract 20.
3. **Changed tests without added tests raise a question, not a blocker.** If
   `pr.testsChanged.length > 0` and `pr.testsAdded.length === 0`, push one question asking
   whether tests were weakened, and subtract 10. (If tests were both changed *and* new
   ones added, don't ask this — that's the normal shape of "fixed the test to match a
   legitimately new behavior.")
4. **New dependencies raise a question each.** For every entry in `pr.deps`, push one
   question naming it (something like "was it necessary?") and subtract 5.

Clamp the final score to the `0`–`100` range before returning. `filesTouched` is part of
the type but isn't used by any of the four rules above — it's there because a real PR
summary carries it, not because this rubric scores it.
