# Specs over vibes

You already know how to describe a bug to a coworker precisely enough that they fix the
right thing. Prompting an agent well is the same skill, aimed at a collaborator who has no
memory of your last conversation, cannot see your screen, and will confidently do the
wrong thing rather than stop and ask. The gap between "make it work" and a task an agent
can actually execute unsupervised is where most of the friction in AI-assisted development
lives.

## Vibe coding and its limits

In February 2025, Andrej Karpathy coined "vibe coding" for a specific mode: you describe
what you want in natural language, accept whatever the model produces, and iterate by
pasting errors back in, never really reading the diff. It's a legitimate way to prototype
— a throwaway script, a one-off visualization, a demo you'll delete in a week. It fails as
a way to build software other people maintain, for a boring reason: nobody, human or
model, holds an entire codebase's invariants in their head from a single loose prompt.
Without a spec, the agent is guessing at your acceptance criteria the same way it's
guessing at your code style, and both guesses drift as the session goes on. The fix isn't
"prompt harder." It's writing down, before code, what you're actually asking for — the
same discipline a design doc gives a team of humans.

## What a task prompt needs

A prompt that survives contact with an autonomous agent has five parts, roughly in this
order:

- **Goal.** One or two sentences, outcome-focused, not implementation-focused. "Users can
  filter the todo list by status" beats "add a `<select>` that changes `filterStatus`."
- **Context.** The files involved, the existing patterns to follow, and anything true
  about this codebase that isn't derivable from reading it cold (a past decision, a
  constraint, a gotcha).
- **Constraints and non-goals.** What's out of scope is as load-bearing as what's in
  scope. "Don't touch the API layer" or "no new dependencies" heads off an agent's
  tendency to solve adjacent problems it notices along the way.
- **Definition of done / acceptance criteria.** Concrete, checkable statements, not
  vibes. "Filtering works" is not checkable. "Selecting 'Active' shows only todos where
  `done === false`, and the count badge updates to match" is.
- **Verification command.** The literal command that proves the work: `pnpm test`,
  `pnpm typecheck`, a specific test file. An agent that's told how it will be checked
  checks itself before saying it's done, instead of you finding the gap later.

### Before and after, same feature

**Before (vibe):**

> Add a filter to the todo list, make it look nice.

This compiles for a human because a human infers the unstated 80%: filter by what, where
does the control go, what happens to the count, does "nice" mean anything testable. An
agent has no such inference to fall back on — it will still produce *something*, just not
reliably the thing you meant, and you won't know which assumptions it picked until you
read the diff.

**After (spec):**

> **Goal:** Add a status filter to `TodoList` so the learner can view all, active, or
> completed items.
> **Context:** `TodoList` lives in `src/components/TodoList.tsx`; items come from
> `useTodos()` and already have a `done: boolean` field. Follow the existing `Toggle`
> component's pattern for grouped buttons rather than a `<select>` (see
> `src/components/Toggle.tsx`).
> **Non-goals:** No persistence of the filter choice across reloads. No changes to the
> `useTodos` hook's return shape.
> **Definition of done:** Three buttons — All / Active / Completed. Clicking one shows
> only matching todos and marks that button `aria-pressed="true"`. The visible count
> reflects the filtered list, not the total.
> **Verify:** `pnpm vitest run src/components/TodoList.test.tsx` passes, and
> `pnpm typecheck` is clean.

Same feature, same size in words, radically different odds of getting what you meant on
the first try — because every sentence in the second version is something you can check
against the result, not just describe your hope for it.

## Progressive disclosure

A spec doesn't need to inline everything relevant — that produces the other failure mode,
a wall of context the model has to parse for the two lines that matter to this task. The
alternative is progressive disclosure: a short entry point that states the essentials and
*points to* deeper material only when it's needed. A two-paragraph `CLAUDE.md` that says
"run `pnpm test` before claiming done; see `docs/authoring-lessons.md` for lesson
conventions" is more useful than pasting that whole document into every prompt. The same
principle governs skills (loaded only when their trigger matches) and `@import` references
in context files (pulled in on demand, not always resident) — both covered in the next
concept step.

## This course as a worked example

This course is authored by an agent, and it was speced before it was built. The order
matters: `docs/superpowers/specs/2026-09-17-react-refresher-design.md` is the design spec
— purpose, decisions already made (and rejected alternatives, which is as useful as the
choice itself), architecture, before a line of the app existed. `docs/authoring-runbook.md`
is the durable procedure for turning curriculum placeholders into real lessons: preflight
checks, how the queue is built, what each implementer's brief contains, the verification
step, and what happens when a lesson doesn't pass (`.authoring-quarantine/`, not a rushed
fix). `docs/authoring-lessons.md` is the narrower, still-durable convention doc — file
layout, the `Check` contract, sandbox import limits, and a "Recurring rulings" section that
exists specifically so the same question doesn't get re-litigated in every lesson's brief.
Notice what's *not* in any of these: no tutorial on how JSX works, nothing a fresh read of
the code would tell you, no secrets. That's the filter for what belongs in a context file,
and it's the subject of the next step.

## Further reading

- [Prompt engineering overview — Anthropic docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [Andrej Karpathy on "vibe coding," X, Feb 2025](https://x.com/karpathy/status/1886192184808149383)
- [Claude Code: CLAUDE.md and memory — Claude Docs](https://code.claude.com/docs/en/memory)
- [AGENTS.md — an open format for guiding coding agents](https://agents.md/)
