# How take-homes are actually graded

A full-stack take-home for a team like Integrate's usually looks the same shape regardless
of company: a small domain (tasks, dependencies, a project or two), a Go API, a Postgres
schema with a migration, a React UI, some tests, a CI workflow, and a README. Budget is
almost always 4-8 hours, framed as "spend what time you need" but graded against what a
reasonable engineer produces in that window. You've spent lessons 102-113 building every
piece this expects on its own; this lesson is about assembling them under a clock and
knowing what a reviewer actually looks at when they open the zip.

## The order a reviewer reads in

Nobody reads a take-home top to bottom like a novel. The order is close to fixed:

1. **README first.** Does it say how to run the thing in one command, and how to run the
   tests? If the reviewer has to guess a port or install something undocumented, you've
   lost goodwill before they've seen a line of your code.
2. **Run it.** `docker compose up` (or equivalent), then the one command the README
   promised. If it doesn't start clean, most reviewers will spend five minutes debugging
   your environment before giving up and reading code cold -- worse context than if it had
   just worked.
3. **Tests.** `go test ./...`, then whatever the frontend uses. A green suite is a small
   signal on its own; a suite that actually exercises the interesting logic (the cycle
   check, the validation, the empty-state) is a bigger one.
4. **Commit history.** `git log --oneline`. A dozen small, named commits reads as "this
   person works the way they'd work on a team." One `wip` commit with 80 files reads as
   "this person committed once at the deadline," even if the code inside is fine.
5. **The code**, roughly in the order the README's "decisions" section points them to.
6. **The gaps.** What's in "not done, and why." This is scored as evidence of judgment, not
   as a deduction for incompleteness -- see below.

## Timeboxing a 4-8 hour window

The single biggest failure mode isn't bad code, it's spending 90% of the budget on features
and 10% on everything a reviewer actually reads first. A rough split that holds up across
company sizes:

- **First ~10%:** read the prompt twice, sketch the data model and the two or three
  endpoints you actually need, decide what you're cutting before you've written any code.
  Thirty minutes of a six-hour take-home, spent thinking, buys you the rest of the time back.
- **Middle ~55%:** the core feature. One thing working end to end (API, store, one UI
  screen) beats three things half-working.
- **~15%:** tests for the part that's actually hard -- the cycle check, the validation, the
  concurrent-update edge case -- not a test for every getter.
- **Last ~20%:** README, CI, `gofmt`/`go vet`/lint cleanup, and cutting anything you can't
  finish cleanly. This block is not optional polish; it's where most of the score lives.

That last block is where people run out of time, because it's the block people plan to "do
if there's time." Plan it in from the start instead.

## What to cut, and how to say so

You will not finish everything the prompt gestures at, and reviewers assume this -- a
scoped-down submission with an honest README beats a submission that silently drops half
the prompt or one that half-implements everything and hides it. The move is a short "not
done" section: name the thing, name why (time, or a real design question you didn't want to
guess on), and, if it's quick, name what you'd do next. "No auth: out of scope for a
task-graph demo, would hang off the same session middleware as the rest of the product" is
a one-line sentence that costs nothing and reads as competence. Silence on the same gap
reads as either not noticing or hoping nobody checks.

## What signals seniority

These are the details reviewers specifically look for because they're the ones a rushed or
junior submission skips:

- **A migration file, not `CREATE TABLE` typed into a setup script or run by hand.** It
  says you've shipped schema changes to a team before.
- **`context.Context` and timeouts on every request-scoped call**, not just passed through
  unused. A handler that never times out its DB call is a handler that can hang a whole
  service under load.
- **Input validation at the boundary** -- empty strings, malformed JSON, unknown fields
  rejected with a clear 400, not a panic or a silent zero value.
- **An index for the query you actually run**, not a guess. `EXPLAIN` your hot path once and
  keep the index that changes the plan, the way lesson 107 covered.
- **CI that runs tests and `go vet` and `pnpm typecheck`**, not just `go build`. A green CI
  badge that only compiles the code is decoration.
- **A Dockerfile or `docker-compose.yml` that works on a clean checkout.** "Works on my
  machine" is disqualifying for a take-home whose entire point is "run this."

## Red flags

- Secrets or connection strings committed, even to a `.env` that should've been gitignored.
- `SELECT *` everywhere, or no `WHERE` clause on a query that obviously needs one.
- Zero tests, or tests that only assert the happy path never errors.
- One giant commit at the deadline with no history to read.
- Framework churn -- pulling in an ORM, a state-management library, and a component kit for
  a four-hour exercise. It reads as not knowing what the prompt actually needs.

## The reviewer's checklist

This is close to the literal list a reviewer runs down, in order:

1. Does the README explain how to run it, in one command?
2. Does it actually run, from a clean checkout?
3. Do the tests pass?
4. Do the tests cover the hard part, not just the easy part?
5. Is the commit history more than one commit?
6. Is there a schema migration, or raw DDL run by hand?
7. Is user input validated before it touches the store or the database?
8. Do request-scoped calls carry a `context.Context` with a timeout?
9. Is there an index for the query the API actually runs?
10. Does CI run tests, `go vet`, and a frontend typecheck -- not just a build?
11. Are third-party GitHub Actions pinned by SHA, not a mutable tag?
12. Is anything secret committed to the repo?
13. Does the README name what's cut, and why?
14. Is the one hard part of the prompt (here: cycle detection, or an optimistic UI update)
    done well, even if something easier was cut to make room for it?
15. Would you want this person on your team based on how they used the time, not just what
    they shipped?

Item 14 is the one people underweight. Reviewers consistently rate "did the one hard thing
well, cut two easy things" higher than "did everything, shallowly." That's the lesson to
carry into the exercise: the template in the next step gives you the easy 80% finished, so
your budget goes into the 20% that's actually load-bearing -- dependency cycles and
readiness -- and into the README/CI polish that most submissions skip.

## Further reading (optional)

- [react.dev -- Thinking in React](https://react.dev/learn/thinking-in-react) -- the same
  "model first, UI second" discipline applies to API design under a clock.
- [Go: Effective Go, on errors](https://go.dev/doc/effective_go#errors) -- the error-handling
  conventions a reviewer expects a Go submission to follow.
- [GitHub Docs -- About security hardening with OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) --
  background for lesson 68's SHA-pinning rule, relevant to the CI workflow this lesson ships.
