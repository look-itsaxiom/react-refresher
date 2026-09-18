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

// ---- mutate, mutationScore, refactorPlan. ----

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

  // === / !==
  for (const m of masked.matchAll(/===|!==/g)) {
    const from = m[0];
    const to = from === '===' ? '!==' : '===';
    add(`changed ${from} to ${to}`, m.index!, m.index! + from.length, to);
  }

  // < / <= / > / >=
  const comparisonFlip: Record<string, string> = { '<=': '<', '<': '<=', '>=': '>', '>': '>=' };
  for (const m of masked.matchAll(/<=|>=|<|>/g)) {
    const from = m[0];
    const to = comparisonFlip[from]!;
    add(`changed ${from} to ${to}`, m.index!, m.index! + from.length, to);
  }

  // + / - (skip ++, --, +=, -=)
  for (const m of masked.matchAll(/\+\+|--|\+=|-=|\+|-/g)) {
    const from = m[0];
    if (from.length === 2) continue;
    const to = from === '+' ? '-' : '+';
    add(`changed ${from} to ${to}`, m.index!, m.index! + from.length, to);
  }

  // true / false
  for (const m of masked.matchAll(/\btrue\b|\bfalse\b/g)) {
    const from = m[0];
    const to = from === 'true' ? 'false' : 'true';
    add(`changed ${from} to ${to}`, m.index!, m.index! + from.length, to);
  }

  // && / ||
  for (const m of masked.matchAll(/&&|\|\|/g)) {
    const from = m[0];
    const to = from === '&&' ? '||' : '&&';
    add(`changed ${from} to ${to}`, m.index!, m.index! + from.length, to);
  }

  // numeric literal, first occurrence only
  const firstNumber = /\d+(\.\d+)?/.exec(masked);
  if (firstNumber) {
    const from = firstNumber[0];
    const to = String(Number(from) + 1);
    add(`changed numeric literal ${from} to ${to}`, firstNumber.index, firstNumber.index + from.length, to);
  }

  // return value -> undefined, only when there's exactly one return statement
  const returns = [...masked.matchAll(/\breturn\b[^;\n]*;?/g)];
  if (returns.length === 1) {
    const r = returns[0]!;
    add('changed the return value to undefined', r.index!, r.index! + r[0].length, 'return undefined;');
  }

  return mutants;
}

export function mutationScore(
  fnSource: string,
  tests: Array<(fn: (...args: any[]) => any) => boolean>,
): { total: number; killed: number; survived: Array<{ id: string; description: string }>; score: number } {
  const name = extractFunctionName(fnSource);
  const mutants = mutate(fnSource);
  let killed = 0;
  const survived: Array<{ id: string; description: string }> = [];

  for (const mutant of mutants) {
    let fn: ((...args: any[]) => any) | undefined;
    let isKilled = false;
    try {
      // eslint-disable-next-line no-new-func
      fn = new Function(`${mutant.source}\nreturn ${name};`)() as (...args: any[]) => any;
    } catch {
      isKilled = true;
    }

    if (!isKilled && fn) {
      for (const test of tests) {
        try {
          if (!test(fn)) {
            isKilled = true;
            break;
          }
        } catch {
          isKilled = true;
          break;
        }
      }
    }

    if (isKilled) killed += 1;
    else survived.push({ id: mutant.id, description: mutant.description });
  }

  const total = mutants.length;
  const score = total === 0 ? 100 : Math.round((killed / total) * 100);
  return { total, killed, survived, score };
}

export type RefactorChange = {
  kind: 'codemod' | 'rename' | 'extract' | 'migrate-api' | 'compiler-enable';
  filesTouched: number;
  hasCharacterizationTests: boolean;
  visualSurface: boolean;
  behindFlag: boolean;
};

export function refactorPlan(change: RefactorChange): { steps: string[]; gates: string[] } {
  const steps: string[] = [];
  const gates: string[] = ['typecheck', 'tests'];

  if (!change.hasCharacterizationTests) {
    steps.push('write characterization tests before touching anything');
  }
  steps.push(`apply the ${change.kind} change`);
  if (change.filesTouched > 20) {
    steps.push('split into reviewable chunks instead of one giant diff');
  }
  if (change.kind === 'migrate-api' && !change.behindFlag) {
    steps.push('ship behind a feature flag');
  }
  steps.push('open a PR for review');

  if (change.visualSurface) {
    gates.push('visual regression');
  }
  if (change.kind === 'compiler-enable') {
    gates.push('compare React DevTools memo counts / profile before and after');
  }

  return { steps, gates };
}
