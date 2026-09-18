export type SpecificityTuple = [number, number, number];

export type CascadeDeclaration = {
  id: string;
  layer: string | null;
  specificity: SpecificityTuple;
  order: number;
  important: boolean;
  value: string;
};

const FUNCTIONAL_PSEUDOS = ['is', 'where', 'not', 'has'];

function addTuples(a: SpecificityTuple, b: SpecificityTuple): SpecificityTuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function maxTuple(a: SpecificityTuple, b: SpecificityTuple): SpecificityTuple {
  if (a[0] !== b[0]) return a[0] > b[0] ? a : b;
  if (a[1] !== b[1]) return a[1] > b[1] ? a : b;
  return a[2] >= b[2] ? a : b;
}

function compareSpecificity(a: SpecificityTuple, b: SpecificityTuple): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

function splitTopLevelCommas(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

export function specificity(selector: string): SpecificityTuple {
  let total: SpecificityTuple = [0, 0, 0];
  let rest = selector;

  for (const name of FUNCTIONAL_PSEUDOS) {
    let idx = rest.toLowerCase().indexOf(`:${name}(`);
    while (idx !== -1) {
      const openParen = idx + name.length + 2;
      let depth = 1;
      let close = openParen;
      while (close < rest.length && depth > 0) {
        if (rest[close] === '(') depth++;
        if (rest[close] === ')') depth--;
        close++;
      }
      const arg = rest.slice(openParen, close - 1);
      if (name !== 'where') {
        const best = splitTopLevelCommas(arg)
          .map((part) => specificity(part.trim()))
          .reduce((acc, s) => maxTuple(acc, s), [0, 0, 0] as SpecificityTuple);
        total = addTuples(total, best);
      }
      rest = rest.slice(0, idx) + rest.slice(close);
      idx = rest.toLowerCase().indexOf(`:${name}(`);
    }
  }

  const ids = rest.match(/#[\w-]+/g) ?? [];
  const classes = rest.match(/\.[\w-]+/g) ?? [];
  const attrs = rest.match(/\[[^\]]*\]/g) ?? [];
  const pseudoElements = rest.match(/::[\w-]+/g) ?? [];
  const pseudoClasses = rest.match(/(?<!:):[a-zA-Z-]+(?!\()/g) ?? [];
  const withoutMarked = rest
    .replace(/#[\w-]+/g, ' ')
    .replace(/\.[\w-]+/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/::[\w-]+/g, ' ')
    .replace(/(?<!:):[a-zA-Z-]+(?!\()/g, ' ');
  const types = withoutMarked.match(/[a-zA-Z][\w-]*/g) ?? [];

  const a = ids.length;
  const b = classes.length + attrs.length + pseudoClasses.length;
  const c = pseudoElements.length + types.length;

  return addTuples(total, [a, b, c]);
}

export function resolveCascade(
  declarations: CascadeDeclaration[],
  layerOrder: string[],
): CascadeDeclaration | null {
  if (declarations.length === 0) return null;

  const isUnlayered = (d: CascadeDeclaration) => d.layer === null || d.layer === undefined;

  const buckets: CascadeDeclaration[][] = [];
  for (const layer of layerOrder) {
    buckets.push(declarations.filter((d) => !d.important && d.layer === layer));
  }
  buckets.push(declarations.filter((d) => !d.important && isUnlayered(d)));
  for (const layer of [...layerOrder].reverse()) {
    buckets.push(declarations.filter((d) => d.important && d.layer === layer));
  }
  buckets.push(declarations.filter((d) => d.important && isUnlayered(d)));

  for (let i = buckets.length - 1; i >= 0; i--) {
    const bucket = buckets[i];
    if (!bucket || bucket.length === 0) continue;
    let winner = bucket[0]!;
    for (const d of bucket.slice(1)) {
      const cmp = compareSpecificity(d.specificity, winner.specificity);
      if (cmp > 0 || (cmp === 0 && d.order > winner.order)) winner = d;
    }
    return winner;
  }
  return null;
}

const exampleSelectors = ['.card', 'div.card#id', ':has(img)', ':where(#a, .b)', ':is(#a, .b)'];

const exampleDeclarations: CascadeDeclaration[] = [
  { id: 'reset', layer: 'reset', specificity: [0, 0, 1], order: 0, important: false, value: 'red' },
  { id: 'utilities', layer: 'utilities', specificity: [0, 1, 0], order: 1, important: false, value: 'blue' },
  { id: 'unlayered', layer: null, specificity: [0, 0, 0], order: 2, important: false, value: 'green' },
];

export default function App() {
  const winner = resolveCascade(exampleDeclarations, ['reset', 'utilities']);

  return (
    <div style={{ fontFamily: 'monospace', padding: 16 }}>
      <h3>specificity()</h3>
      <table>
        <tbody>
          {exampleSelectors.map((sel) => (
            <tr key={sel}>
              <td>{sel}</td>
              <td>{JSON.stringify(specificity(sel))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>resolveCascade()</h3>
      <p>Winner: {winner ? `${winner.id} (${winner.value})` : 'none'}</p>
    </div>
  );
}
