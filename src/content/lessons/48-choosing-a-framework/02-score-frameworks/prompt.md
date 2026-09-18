# Build a framework scorer

You're given a catalog of framework capability profiles and a
requirements object with weighted criteria and hard constraints. Implement
`scoreFrameworks` so it eliminates anything that fails a hard constraint
(with a human-readable reason per failed constraint) and ranks the rest by
a weighted score.

## Types

```ts
type RSCSupport = 'stable' | 'unstable' | 'none';

type FrameworkProfile = {
  name: string;
  rsc: RSCSupport;
  ssg: boolean;
  edge: boolean;
  typedRoutes: boolean;
  vendorNeutral: boolean;
  maturity: number; // 1 (brand new) .. 5 (long-stable API)
  learningCurve: number; // 1 (gentle) .. 5 (steep)
};

type CriterionKey =
  | 'rsc' | 'ssg' | 'edge' | 'typedRoutes' | 'vendorNeutral' | 'maturity' | 'learningCurve';

type Weights = Partial<Record<CriterionKey, number>>;

type HardConstraints = {
  rsc?: RSCSupport[]; // framework's rsc must be one of these
  ssg?: boolean; // if true, framework.ssg must be true
  edge?: boolean;
  typedRoutes?: boolean;
  vendorNeutral?: boolean;
  minMaturity?: number; // framework.maturity must be >= this
  maxLearningCurve?: number; // framework.learningCurve must be <= this
};

type Requirements = {
  weights: Weights;
  hardConstraints?: HardConstraints;
};

type ScoredFramework = {
  name: string;
  score: number;
  contributions: Partial<Record<CriterionKey, number>>;
};

type Elimination = { name: string; reasons: string[] };

type ScoreOutcome = {
  ranked: ScoredFramework[]; // sorted by score, descending; ties broken by name, ascending
  eliminated: Elimination[];
};

function scoreFrameworks(requirements: Requirements, catalog: FrameworkProfile[]): ScoreOutcome;
```

## Step 1: eliminate on hard constraints

Check `hardConstraints` (skip any key that's `undefined`) against every
framework in the catalog:

- `rsc`: framework must have `rsc` in the given array, else eliminate with
  reason `` `rsc is "<value>", requires one of: <comma-separated list>` ``.
- `ssg` / `edge` / `typedRoutes` / `vendorNeutral`: when the constraint is
  `true`, the framework's field must also be `true`, else eliminate with
  reason `` `<field> is false, required true` ``.
- `minMaturity`: framework's `maturity` must be `>=` the constraint, else
  eliminate with reason `` `maturity <value> is below minimum <min>` ``.
- `maxLearningCurve`: framework's `learningCurve` must be `<=` the
  constraint, else eliminate with reason
  `` `learningCurve <value> exceeds maximum <max>` ``.

A framework can fail more than one constraint — collect every reason it
fails, not just the first. A framework that fails at least one constraint
goes in `eliminated` (with all its reasons) and is excluded from `ranked`
entirely, regardless of how it would have scored.

## Step 2: score what's left

For every framework that survived step 1, and for every key present in
`requirements.weights` (skip keys with an `undefined` weight), normalize
that criterion's value to a 0–1 range, multiply by the weight, and record
it in `contributions`:

- Boolean fields (`ssg`, `edge`, `typedRoutes`, `vendorNeutral`):
  normalized value is `1` if `true`, `0` if `false`.
- `rsc`: normalized value is `1` for `'stable'`, `0.5` for `'unstable'`,
  `0` for `'none'`.
- `maturity` (1–5 scale, higher is better): normalized value is
  `(maturity - 1) / 4`.
- `learningCurve` (1–5 scale, higher is *worse*): normalized value is
  `(5 - learningCurve) / 4` — this inverts it so a steeper curve always
  pulls the score down.

`score` is the sum of all entries in `contributions`. Sort `ranked`
descending by `score`; when two scores are equal (within floating-point
noise, i.e. `Math.abs(a - b) < 1e-9`), sort those by `name` ascending.

## Ship something visible

Render a small default `App` that calls `scoreFrameworks` with any sample
requirements and catalog, and lists the ranked names with their scores (and
any eliminated names with their reasons) so the preview shows something.
