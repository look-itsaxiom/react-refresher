Build a small scanner that flags the AI-generated test smells from the concept step, the same
way a linter flags style issues — by pattern-matching the test file's source text, not by
running it.

Three helpers are already implemented for you in the starter — don't change them:

- `findTestSegments(source): Array<{ marker; text }>` — finds every `it(...)`/`test(...)`
  declaration line (including `.skip`/`.only`) and slices the source into one **segment** per
  test: from that test's declaration line up to the next test's declaration (or end of file).
  `marker.name` is the test's name string; `marker.modifier` is `'skip'`, `'only'`, or `undefined`.
- `normalizeModulePath(path)` — strips a leading `./` and a trailing `.ts`/`.tsx`/`.js`/`.jsx`, so
  `'./Cart'` and `'./Cart.tsx'` compare equal.
- `mocksTheSubject(source)` — `true` if the file has a `vi.mock('<path>')` call whose path
  (normalized) matches the file's first relative `import ... from '<path>'` — i.e. the file mocks
  the very thing it claims to be testing.

Also provided, as constants to use directly:

- `TAUTOLOGY_RE` — matches `expect(<literal>).toBe(<same literal>)` for `true`/`false`, a bare
  number, or a quoted string, via a backreference (so `expect(true).toBe(true)` and
  `expect(2).toBe(2)` both match, but `expect(x).toBe(2)` does not).
- `IMPLEMENTATION_DETAIL_RE` — matches `container.querySelector(`, `getByTestId(`,
  `queryByTestId(`, or `findByTestId(`.
- `NEGATIVE_NAME_RE` — matches `not`, `invalid`, `error`, `empty`, or `fails` (case-insensitive).
- `SNAPSHOT_CALL_RE` — matches `toMatchSnapshot(` or `toMatchInlineSnapshot(`.

Implement `analyzeTestFile(source: string): AnalyzeResult`:

```ts
type TestSmell =
  | 'tautology' | 'no-assertion' | 'snapshot-overuse' | 'mocks-subject'
  | 'implementation-detail' | 'skipped' | 'only';
type AnalyzedTest = { name: string; smells: TestSmell[] };
type AnalyzeResult = { tests: AnalyzedTest[]; score: number; summary: string[] };
```

**Per test** (one `AnalyzedTest` per segment from `findTestSegments`), add to `smells`:

- `'skipped'` if `marker.modifier === 'skip'`; `'only'` if `marker.modifier === 'only'`.
- `'no-assertion'` if the segment's text contains no `expect(`.
- `'tautology'` if `TAUTOLOGY_RE` matches the segment.
- `'implementation-detail'` if `IMPLEMENTATION_DETAIL_RE` matches the segment.
- `'snapshot-overuse'` if the **file** contains more than one `toMatchSnapshot`/
  `toMatchInlineSnapshot` call in total, and *this* segment contains at least one.
- `'mocks-subject'` if `mocksTheSubject(source)` is true — this one is a file-level fact, so
  every test in the file gets it, not just the one near the `vi.mock` call.

**`summary`** (file-level notes, independent of any one test):

- If `mocksTheSubject(source)`, add a message that mentions `vi.mock` and the fact that it's
  mocking the subject under test.
- If no test's name matches `NEGATIVE_NAME_RE`, add a message that says so — mention that no test
  name covers a negative case.

**`score`** — start at 100 and subtract, then floor at 0:

| smell | deduction | scope |
|---|---|---|
| `tautology` | 20 | per test |
| `no-assertion` | 20 | per test |
| `only` | 15 | per test |
| `snapshot-overuse` | 10 | per test |
| `skipped` | 5 | per test |
| `implementation-detail` | 5 | per test |
| `mocks-subject` | 15 | once per file, even though every test lists it |
| no negative case | 10 | once per file |

A file with no smells at all scores 100. The checks render a smelly fixture and a clean one
through your function — the smelly one should land at a clearly bad score, and the clean one at
90 or above.
