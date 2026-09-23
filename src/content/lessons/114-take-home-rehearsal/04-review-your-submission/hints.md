Build `blockers`, `strengths`, and `suggestions` as plain arrays you push onto in order, and
track `score` as a running number you adjust as you go -- there's no need for anything
fancier. Apply the checks in the order the prompt lists them; the secrets cap has to come
last because it overrides everything computed before it.

---

`undocumentedGaps` is the one easy to get backwards:

```ts
const notDoneCount = s.readme.notDone?.length ?? 0;
const undocumentedGaps = Math.max(0, s.featuresPlanned - s.featuresDone - notDoneCount);
```

A gap only "counts" if it's neither finished nor named in `notDone`. A submission that
finished everything it planned (`featuresPlanned === featuresDone`) has zero gaps regardless
of what's in `notDone`.

---

The secrets rule is a cap, not a subtraction -- `score = Math.min(score, 30)`, applied after
every other adjustment, not a flat `-70`. A submission that would've scored `10` from other
penalties stays at `10`, not `30`; the cap only pulls a high score *down* to `30`.

---

For `timebox`, compute the first three with `Math.round(minutes / 5) * 5`, and let the fourth
be `totalMinutes - (sum of the other three)`. Because `totalMinutes` and each of the first
three phases are already multiples of 5, the remainder is guaranteed to be one too -- you
don't need to round the last phase separately:

```ts
const totalMinutes = totalHours * 60;
const roundTo5 = (n: number) => Math.round(n / 5) * 5;
const plan = roundTo5(totalMinutes * 0.1);
const core = roundTo5(totalMinutes * 0.55);
const tests = roundTo5(totalMinutes * 0.15);
const cleanup = totalMinutes - plan - core - tests;
```
