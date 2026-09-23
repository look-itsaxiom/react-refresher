# What's coming, and what died

Not everything proposed at TC39 ships, and not everything shipped is usable in this sandbox
yet. This step is prose-only on purpose: grading these features would mean grading a
polyfill or a transform, not the feature — see each status line for exactly where that line
sits today.

## Temporal: fixing `Date`

`Date` has been broken in the same well-known ways since 1995: it's mutable (every setter
mutates in place, so passing a `Date` around is handing out a shared mutable value), it
conflates a wall-clock reading with a UTC instant, its parsing is inconsistent across
engines for anything but ISO 8601, and "add one month" has no built-in that handles
month-length or DST correctly.

`Temporal` replaces it with immutable, purpose-specific types: `Temporal.PlainDate` (a
calendar date with no time or zone — "2026-09-17"), `Temporal.ZonedDateTime` (an instant
plus a time zone, for "when does this meeting happen locally"), `Temporal.Instant` (a UTC
timestamp, for "when did this event occur"), `Temporal.Duration`, and more. Every operation
returns a new object:

```ts
const meeting = Temporal.ZonedDateTime.from('2026-09-17T14:00[America/New_York]');
const followUp = meeting.add({ weeks: 1 }); // meeting itself is untouched
```

**Status:** the proposal reached Stage 4 and is part of the language specification. Engine
rollout is still in progress across the board, and Node 22 — what this sandbox's checks run
against — does not have a global `Temporal` yet, so exercises here don't grade it. If you
want to use it today, `@js-temporal/polyfill` implements the full spec and is what most
teams reach for until their minimum supported runtime catches up. Track actual availability
per-runtime before depending on it in production code, the same way you'd check any newly
Baseline feature.

## Explicit resource management: `using` and `await using`

The proposal standardizes a pattern every long-lived codebase reinvents: a value that owns a
resource (a file handle, a lock, a subscription, a database connection) and needs guaranteed
cleanup, including when an exception is thrown partway through using it.

```ts
using file = openFile(path); // calls file[Symbol.dispose]() at end of scope, even on throw
await using connection = await openConnection(); // async cleanup via Symbol.asyncDispose
```

This is the same shape as Python's `with`, C#'s `using`, or Java's try-with-resources,
formalized for JS: implement `[Symbol.dispose]()` (or `[Symbol.asyncDispose]()`) on a value,
declare it with `using`, and the engine calls the cleanup for you when the block exits —
normally or via an exception — instead of you writing a `try`/`finally` by hand every time.

**Status:** the proposal reached Stage 4. TypeScript has parsed and transformed `using`
declarations since 5.2. This matters for where you'll actually meet it: this sandbox
transpiles with Sucrase, which strips types but does not implement the disposal transform,
and Node 22 does not execute `using` as valid syntax natively — a bare `using x = ...;`
throws a `SyntaxError` at the top level here, confirmed by running it directly. Exercises in
this lesson don't use it. In a project on TypeScript 5.2+ targeting a runtime that has
shipped it, it works as written above with no transform needed once the target engine
supports it; on an older target, TypeScript's own downleveling emits the `try`/`finally`
for you.

## Decorators: TC39 vs. the TypeScript flag you've been using

If you've written `@Injectable()` or `@observable` in a TypeScript codebase, you used
TypeScript's original `experimentalDecorators` flag — a design TC39 never adopted, evaluated
differently at each stage, and now considers legacy.

The TC39 decorators proposal (reached Stage 3) has different runtime semantics: a decorator
is a function `(value, context) => replacement | void`, decorators run once at class
definition time in a fixed order, and there's no equivalent of the old parameter-decorator
metadata reflection some DI frameworks leaned on. TypeScript 5.0+ implements *this* version
when `experimentalDecorators` is off (the current default for new projects) — so "decorators
work in TypeScript" has meant two different, non-interchangeable features depending on when
your codebase turned that flag on. If you're touching a decorator-heavy codebase, check
which one it's using before assuming `@dec class Foo {}` behaves the way it did last time
you saw it; native engine support for the new proposal is not yet ubiquitous, so most usage
today still goes through a compiler transform (TypeScript's, or Babel's Stage 3 plugin), not
a runtime that implements the syntax directly — confirmed by running decorator syntax
directly in Node 22, which rejects it as invalid syntax.

## Better internationalization

`Intl.Segmenter` (Baseline) splits text into graphemes, words, or sentences with actual
Unicode-aware rules — the thing every hand-rolled "split on word boundaries" regex gets
subtly wrong for non-Latin scripts and emoji. `Intl.DurationFormat` formats a
`{ hours, minutes }`-shaped duration ("2 hr, 15 min") the way `Intl.NumberFormat` formats a
number, instead of you hand-building the string per locale.

## What died

**Records & Tuples** — deeply immutable, structurally-compared object and array literals
(`#{ x: 1 }`, `#[1, 2, 3]`) — reached Stage 2 and was withdrawn by TC39 consensus in April
2025 over unresolved semantic questions about introducing new primitive types into the
language. Its concerns didn't disappear: the **Composites** proposal picked up the same
problem (deep immutability with structural equality) from Stage 1, but as ordinary objects
rather than new primitives — worth tracking if you were waiting on the original.

**The pipeline operator** (`|>`) has been stuck in committee disagreement over which of
several competing semantics to adopt for years and has not shipped in any engine. Don't
plan around it.

**Pattern matching** (`match` expressions) is still an early-stage proposal with an
unsettled syntax; treat any code sample you find online as speculative until it reaches
Stage 3.

**Deferred module evaluation** (`import defer * as ns from './heavy.js'`) lets you import a
module's namespace object without running its top-level code until you first touch a
binding on it — useful for optional or conditionally-needed modules. It's progressing
through committee but isn't broadly shipped; treat it the same as the other pre-Stage-4
items here.

## How to track this yourself

Proposal stage isn't the same as "usable today." For any feature: check its stage on the
[TC39 proposals repo](https://github.com/tc39/proposals), then check actual engine support
on [caniuse](https://caniuse.com/) or its [web.dev Baseline](https://web.dev/baseline)
status — Stage 4 means "will ship eventually," Baseline means "already ships in every
current browser and has for at least 30 months" (Baseline "newly available" means it just
crossed that line in every engine, without the 30-month buffer yet).

## Further reading (optional)
- [TC39 proposals repo](https://github.com/tc39/proposals) — live stage tracking for everything above
- [tc39/proposal-temporal](https://github.com/tc39/proposal-temporal) — spec, polyfill link, and status
- [tc39/proposal-explicit-resource-management](https://github.com/tc39/proposal-explicit-resource-management) — `using`/`await using` spec text
- [web.dev: Baseline](https://web.dev/baseline) — what "Baseline" and "newly available" actually mean
