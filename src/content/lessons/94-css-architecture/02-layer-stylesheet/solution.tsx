export type LayerName = 'reset' | 'base' | 'tokens' | 'components' | 'utilities' | 'overrides';
export type LayerChunk = { layer: LayerName | null; css: string };
export type LayerResult = { css: string; warnings: string[] };

const DEFAULT_ORDER: LayerName[] = ['reset', 'base', 'tokens', 'components', 'utilities', 'overrides'];

function isIdentChar(ch: string | undefined): boolean {
  return !!ch && /[a-zA-Z0-9_-]/.test(ch);
}

function consumeIdent(text: string, i: number): number {
  let j = i;
  while (j < text.length && isIdentChar(text[j])) j++;
  return j;
}

/** Finds the index of the matching closing bracket for an opening bracket at `openIndex`. */
function findMatching(text: string, openIndex: number, open: string, close: string): number {
  let depth = 0;
  for (let j = openIndex; j < text.length; j++) {
    if (text[j] === open) depth++;
    else if (text[j] === close) {
      depth--;
      if (depth === 0) return j;
    }
  }
  return text.length - 1;
}

/** Splits a selector list on commas that are not nested inside (), [], or a :where()/:is() argument. */
export function splitTopLevelSelectors(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = text.slice(start).trim();
  if (last) parts.push(last);
  return parts.filter(Boolean);
}

function compareTuple(a: [number, number, number], b: [number, number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

export function specificity(selector: string): [number, number, number] {
  let a = 0;
  let b = 0;
  let c = 0;
  let i = 0;
  const n = selector.length;

  while (i < n) {
    const ch = selector[i];

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '>' || ch === '+' || ch === '~') {
      i++;
      continue;
    }
    if (ch === '*') {
      i++;
      continue;
    }
    if (ch === '#') {
      i = consumeIdent(selector, i + 1);
      a++;
      continue;
    }
    if (ch === '.') {
      i = consumeIdent(selector, i + 1);
      b++;
      continue;
    }
    if (ch === '[') {
      const end = findMatching(selector, i, '[', ']');
      i = end + 1;
      b++;
      continue;
    }
    if (ch === ':') {
      if (selector[i + 1] === ':') {
        i = consumeIdent(selector, i + 2);
        c++;
        continue;
      }
      const identStart = i + 1;
      const identEnd = consumeIdent(selector, identStart);
      const name = selector.slice(identStart, identEnd).toLowerCase();
      i = identEnd;
      if (selector[i] === '(') {
        const end = findMatching(selector, i, '(', ')');
        const inner = selector.slice(i + 1, end);
        i = end + 1;
        if (name === 'where') {
          // :where() always contributes zero, regardless of its contents.
        } else if (name === 'is' || name === 'not' || name === 'has') {
          const args = splitTopLevelSelectors(inner);
          let best: [number, number, number] = [0, 0, 0];
          for (const arg of args) {
            const s = specificity(arg);
            if (compareTuple(s, best) > 0) best = s;
          }
          a += best[0];
          b += best[1];
          c += best[2];
        } else {
          // Any other functional pseudo-class (:nth-child(2), :lang(en), ...).
          b++;
        }
      } else {
        b++;
      }
      continue;
    }
    if (isIdentChar(ch)) {
      i = consumeIdent(selector, i);
      c++;
      continue;
    }
    // Unknown character (e.g. an escape) — skip defensively.
    i++;
  }

  return [a, b, c];
}

function wrapSelectorInWhere(selector: string): string {
  return selector.includes(':where(') ? selector : `:where(${selector})`;
}

/** Rewrites every rule's selector list in a flat (non-nested) CSS chunk to be :where()-wrapped. */
function transformSelectorsToWhere(css: string): string {
  let result = '';
  let i = 0;
  while (i < css.length) {
    const openBrace = css.indexOf('{', i);
    if (openBrace === -1) {
      result += css.slice(i);
      break;
    }
    const closeBrace = css.indexOf('}', openBrace);
    if (closeBrace === -1) {
      result += css.slice(i);
      break;
    }
    const selectorList = css.slice(i, openBrace).trim();
    const body = css.slice(openBrace, closeBrace + 1);
    if (!selectorList) {
      result += css.slice(i, closeBrace + 1);
    } else {
      const rewritten = splitTopLevelSelectors(selectorList).map(wrapSelectorInWhere).join(', ');
      result += `${rewritten} ${body}`;
    }
    i = closeBrace + 1;
  }
  return result;
}

export function layerStylesheet(chunks: LayerChunk[], order: LayerName[] = DEFAULT_ORDER): LayerResult {
  const warnings: string[] = [];
  const byLayer = new Map<LayerName, string[]>();
  const unlayered: string[] = [];

  chunks.forEach((chunk, index) => {
    if (chunk.layer === null) {
      unlayered.push(chunk.css);
      warnings.push(`Chunk ${index} has no layer; left outside @layer (unlayered CSS beats every layer).`);
      return;
    }
    const existing = byLayer.get(chunk.layer) ?? [];
    existing.push(chunk.css);
    byLayer.set(chunk.layer, existing);
  });

  const parts: string[] = [`@layer ${order.join(', ')};`];

  for (const layer of order) {
    const layerChunks = byLayer.get(layer);
    if (!layerChunks || layerChunks.length === 0) continue;
    let merged = layerChunks.join('\n');
    if (layer === 'reset' || layer === 'base') {
      merged = transformSelectorsToWhere(merged);
    }
    parts.push(`@layer ${layer} {\n${merged}\n}`);
  }

  if (unlayered.length > 0) {
    parts.push(unlayered.join('\n'));
  }

  return { css: parts.join('\n\n'), warnings };
}

const sample = layerStylesheet([
  { layer: 'reset', css: '*, *::before, *::after { box-sizing: border-box; }' },
  { layer: 'components', css: '.card { padding: 1rem; }' },
  { layer: null, css: '.legacy-widget { color: red; }' },
  { layer: 'utilities', css: '.p-0 { padding: 0; }' },
]);

export default function App() {
  return (
    <div>
      <h1>Layered stylesheet</h1>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{sample.css}</pre>
      {sample.warnings.length > 0 && (
        <ul>
          {sample.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
