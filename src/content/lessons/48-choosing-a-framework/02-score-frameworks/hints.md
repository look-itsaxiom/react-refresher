Split the work into two clear passes: first walk the catalog once and
decide, per framework, which ones survive the hard constraints (collecting
every failed reason, not just the first) — then only score the survivors.
Don't try to eliminate and score in the same loop iteration; it's much
easier to reason about (and debug) as two separate steps.

---

For the hard-constraint pass, write one small helper that takes a single
`FrameworkProfile` and the `HardConstraints` object and returns a
`string[]` of reasons (empty array means it passes everything). Call that
helper once per framework in the catalog. A framework goes to `eliminated`
if that array is non-empty, otherwise it's a survivor.

---

For scoring, write a `normalize(key, framework)` function that returns a
0–1 number for a single criterion, using a `switch` (or lookup table) over
the criterion key. This keeps the boolean/rsc/maturity/learningCurve
formulas each in one place instead of scattered through the scoring loop.
Remember `learningCurve` inverts: `(5 - value) / 4`, not `(value - 1) / 4`
like `maturity`.

---

Only iterate over the keys actually present in `requirements.weights`
(`Object.entries` gives you `[key, weight]` pairs) — a framework's
`contributions` object should only have entries for criteria the caller
actually weighted, not all seven keys every time.

---

Full shape:

```ts
function checkHardConstraints(f, hc) {
  const reasons = [];
  if (hc?.rsc && !hc.rsc.includes(f.rsc)) reasons.push(/* ... */);
  // ...one `if` per constraint kind, pushing a reason on failure
  return reasons;
}

function normalize(key, f) {
  switch (key) {
    case 'rsc': return f.rsc === 'stable' ? 1 : f.rsc === 'unstable' ? 0.5 : 0;
    case 'maturity': return (f.maturity - 1) / 4;
    case 'learningCurve': return (5 - f.learningCurve) / 4;
    default: return f[key] ? 1 : 0; // the four booleans
  }
}

export function scoreFrameworks(requirements, catalog) {
  const eliminated = [];
  const survivors = [];
  for (const f of catalog) {
    const reasons = checkHardConstraints(f, requirements.hardConstraints);
    (reasons.length ? eliminated.push({ name: f.name, reasons }) : survivors.push(f));
  }

  const ranked = survivors.map((f) => {
    const contributions = {};
    let score = 0;
    for (const [key, weight] of Object.entries(requirements.weights)) {
      if (weight === undefined) continue;
      contributions[key] = weight * normalize(key, f);
      score += contributions[key];
    }
    return { name: f.name, score, contributions };
  });

  ranked.sort((a, b) => (Math.abs(a.score - b.score) < 1e-9 ? a.name.localeCompare(b.name) : b.score - a.score));
  return { ranked, eliminated };
}
```
