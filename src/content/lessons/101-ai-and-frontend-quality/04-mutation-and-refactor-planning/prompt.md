Build a miniature version of what Stryker does — apply small, mechanical mutations to a
function's source text, then check whether a test set notices — plus a small rule-based planner
for how to safely ship a refactor.

Two helpers are already implemented for you in the starter — don't change them:

- `maskLiterals(source: string): string` — returns a same-length copy of `source` with everything
  inside a string or template literal (including the quotes) replaced by spaces. Scan *this*
  string with your regexes to find operator positions safely — since it's the same length as
  `source`, an index found in the masked text is also the right index into the real `source` —
  but slice and build mutant text from the **original** `source`, never from the masked one.
- `extractFunctionName(fnSource: string): string` — pulls the name out of a `function name(...) {`
  declaration.

Two mutation rules are implemented for you as examples, showing the pattern: **`===`/`!==`** (a
single find-and-flip) and **`<`/`<=`/`>`/`>=`** (four possible tokens, mapped to their flip).

### `mutate(fnSource: string): Mutant[]`

```ts
type Mutant = { id: string; description: string; source: string };
```

For every occurrence of a mutable token, produce **one mutant per occurrence** — a full copy of
`fnSource` with only that one occurrence changed, everything else untouched. Implement the
remaining rules, each scanning the masked source with `.matchAll(...)`:

- **`+`/`-`** — flip a lone `+` to `-` and vice versa, but skip `++`, `--`, `+=`, and `-=` — match
  those first so a single find-and-flip on `+`/`-` alone doesn't fire inside them.
- **`true`/`false`** — flip the keyword.
- **`&&`/`||`** — flip the operator.
- **numeric literal** — the *first* `\d+(\.\d+)?` match in the whole source only (not every
  occurrence): replace it with itself plus one (`10` becomes `11`).
- **return value** — only when the function has **exactly one** `return` statement (more than one
  is ambiguous — which one would you mutate?): replace that entire `return <expr>;` with
  `return undefined;`.

### `mutationScore(fnSource, tests)`

```ts
type Test = (fn: (...args: any[]) => any) => boolean;
function mutationScore(fnSource: string, tests: Test[]): {
  total: number; killed: number; survived: Array<{ id; description }>; score: number;
};
```

For each mutant from `mutate(fnSource)`: compile it with `new Function(mutant.source + '\nreturn '
+ name + ';')()` (the name is `extractFunctionName(fnSource)`) inside a `try`/`catch` — if it
throws while *compiling*, the mutant is killed on the spot, no need to run any tests against it.
Otherwise run every test against the compiled mutant function; if a test returns `false`, or
throws while running, the mutant is killed. A mutant that survives every test goes in `survived`.
`score` is `killed / total` as a percentage, rounded, or `100` when there are no mutants at all.

### `refactorPlan(change)`

```ts
type Change = {
  kind: 'codemod' | 'rename' | 'extract' | 'migrate-api' | 'compiler-enable';
  filesTouched: number;
  hasCharacterizationTests: boolean;
  visualSurface: boolean;
  behindFlag: boolean;
};
function refactorPlan(change: Change): { steps: string[]; gates: string[] };
```

Every plan's `gates` starts with `['typecheck', 'tests']`. Every plan's `steps` ends with
`'apply the <kind> change'` then `'open a PR for review'`. Between those, apply the rules:

- No `hasCharacterizationTests` → insert a step to write them, **before** applying the change.
- `filesTouched > 20` → add a step about splitting into reviewable chunks.
- `kind === 'migrate-api'` and not `behindFlag` → add a step about shipping behind a feature flag.
- `visualSurface` → add a `'visual regression'` gate.
- `kind === 'compiler-enable'` → add a gate about comparing React DevTools memo counts / profiling.

The exact wording is yours — the checks look for keywords (`characterization`, `chunk`/`split`,
`flag`, `visual`, `devtools`/`memo`/`profile`), not an exact string.
