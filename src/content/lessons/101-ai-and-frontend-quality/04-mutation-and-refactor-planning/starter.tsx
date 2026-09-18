const CLASSIFY_SOURCE = `function classify(n, low, high) {
  if (n < low) return 'low';
  if (n > high) return 'high';
  return 'mid';
}`;

export default function App() {
  const mutants = mutate(CLASSIFY_SOURCE);
  const result = mutationScore(CLASSIFY_SOURCE, [
    (classify) => (classify as (n: number, l: number, h: number) => string)(5, 0, 10) === 'mid',
  ]);
  const plan = refactorPlan({
    kind: 'migrate-api',
    filesTouched: 30,
    hasCharacterizationTests: false,
    visualSurface: true,
    behindFlag: false,
  });
  return (
    <div>
      <p>{mutants.length} mutants</p>
      <p>
        score {result.score} ({result.killed}/{result.total})
      </p>
      <ol>
        {plan.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

// ---- Provided helpers. Don't change these. ----

/** Same-length copy of `source` with string/template literal contents (and their quotes) masked to spaces. */
export function maskLiterals(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      out += ' ';
      i += 1;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < source.length) {
          out += '  ';
          i += 2;
          continue;
        }
        out += ' ';
        i += 1;
      }
      if (i < source.length) {
        out += ' ';
        i += 1;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Pulls the name out of a `function name(...) {` declaration. */
export function extractFunctionName(fnSource: string): string {
  const m = /function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/.exec(fnSource);
  if (!m) throw new Error('Could not find a named function declaration in the source.');
  return m[1]!;
}

// ---- Your work: mutate, mutationScore, refactorPlan. ----

export type Mutant = { id: string; description: string; source: string };

export function mutate(fnSource: string): Mutant[] {
  const masked = maskLiterals(fnSource);
  const mutants: Mutant[] = [];
  let counter = 0;
  const add = (description: string, start: number, end: number, replacement: string) => {
    counter += 1;
    mutants.push({
      id: `m${counter}`,
      description,
      source: fnSource.slice(0, start) + replacement + fnSource.slice(end),
    });
  };

  // Example 1: a simple find-and-flip, one token type.
  for (const m of masked.matchAll(/===|!==/g)) {
    const from = m[0];
    const to = from === '===' ? '!==' : '===';
    add(`changed ${from} to ${to}`, m.index, m.index + from.length, to);
  }

  // Example 2: four possible tokens, mapped to their flip.
  const comparisonFlip: Record<string, string> = { '<=': '<', '<': '<=', '>=': '>', '>': '>=' };
  for (const m of masked.matchAll(/<=|>=|<|>/g)) {
    const from = m[0];
    const to = comparisonFlip[from]!;
    add(`changed ${from} to ${to}`, m.index, m.index + from.length, to);
  }

  // TODO: +/- — flip a lone + or -, skipping ++, --, +=, -=.

  // TODO: true/false — flip the keyword.

  // TODO: &&/|| — flip the operator.

  // TODO: numeric literal — first \d+(\.\d+)? match only, replaced with itself + 1.

  // TODO: return value — only if there is exactly one `return <expr>;` in fnSource, replace it
  // with `return undefined;`.

  return mutants;
}

export function mutationScore(
  fnSource: string,
  tests: Array<(fn: (...args: any[]) => any) => boolean>,
): { total: number; killed: number; survived: Array<{ id: string; description: string }>; score: number } {
  // TODO: for each mutant from mutate(fnSource), compile it with `new Function` (wrapped in
  // try/catch — a compile error counts as killed), then run every test against the compiled
  // function (a `false` result or a thrown error also counts as killed). Anything that survives
  // every test goes in `survived`.
  return { total: 0, killed: 0, survived: [], score: 100 };
}

export type RefactorChange = {
  kind: 'codemod' | 'rename' | 'extract' | 'migrate-api' | 'compiler-enable';
  filesTouched: number;
  hasCharacterizationTests: boolean;
  visualSurface: boolean;
  behindFlag: boolean;
};

export function refactorPlan(change: RefactorChange): { steps: string[]; gates: string[] } {
  // TODO: build `steps` and `gates` following the rules in the prompt.
  return { steps: [], gates: [] };
}
