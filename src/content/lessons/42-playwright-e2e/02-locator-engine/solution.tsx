import { useState } from 'react';

export type Step =
  | { kind: 'role'; role: string; name?: string }
  | { kind: 'text'; text: string; exact?: boolean }
  | { kind: 'testId'; id: string }
  | { kind: 'filter'; hasText: string }
  | { kind: 'nth'; index: number }
  | { kind: 'locator'; css: string };
export type Chain = Step[];

function accessibleName(el: Element): string {
  const label = el.getAttribute('aria-label');
  if (label) return label.replace(/\s+/g, ' ').trim();
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function roleOf(el: Element): string | null {
  const explicit = el.getAttribute('role');
  if (explicit) return explicit;
  const tag = el.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  if (tag === 'a') return el.hasAttribute('href') ? 'link' : null;
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (tag === 'textarea') return 'textbox';
  if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (['text', 'search', 'email', 'tel', 'url'].includes(type)) return 'textbox';
    if (['button', 'submit', 'reset'].includes(type)) return 'button';
    return null;
  }
  return null;
}

function scopesFor(current: Element[], root: Element): Element[] {
  return current.length > 0 ? current : [root];
}

function descendantsOf(el: Element): Element[] {
  return Array.from(el.querySelectorAll('*'));
}

export function locate(root: Element, chain: Chain): Element[] {
  let current: Element[] = [];

  // role/text/testId search the DESCENDANTS of the current scope (root, or each existing
  // candidate) — chaining narrows into a subtree, it doesn't re-test the candidates themselves.
  const searchWithin = (predicate: (el: Element) => boolean): Element[] => {
    const scopes = scopesFor(current, root);
    const seen = new Set<Element>();
    const result: Element[] = [];
    for (const scope of scopes) {
      for (const el of descendantsOf(scope)) {
        if (predicate(el) && !seen.has(el)) {
          seen.add(el);
          result.push(el);
        }
      }
    }
    return result;
  };

  for (const step of chain) {
    if (step.kind === 'role') {
      current = searchWithin((el) => {
        if (roleOf(el) !== step.role) return false;
        if (step.name !== undefined && accessibleName(el) !== step.name) return false;
        return true;
      });
    } else if (step.kind === 'text') {
      const matches = searchWithin((el) => {
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        return step.exact ? text === step.text : text.includes(step.text);
      });
      current = matches.filter((el) => !matches.some((other) => other !== el && el.contains(other)));
    } else if (step.kind === 'testId') {
      current = searchWithin((el) => el.getAttribute('data-testid') === step.id);
    } else if (step.kind === 'filter') {
      current = current.filter((el) => (el.textContent ?? '').includes(step.hasText));
    } else if (step.kind === 'nth') {
      current = current[step.index] !== undefined ? [current[step.index]!] : [];
    } else if (step.kind === 'locator') {
      const scopes = scopesFor(current, root);
      const seen = new Set<Element>();
      const result: Element[] = [];
      for (const scope of scopes) {
        for (const el of Array.from(scope.querySelectorAll(step.css))) {
          if (!seen.has(el)) {
            seen.add(el);
            result.push(el);
          }
        }
      }
      current = result;
    }
  }

  return current;
}

export function strictOne(chain: Chain, root: Element): Element {
  const matches = locate(root, chain);
  if (matches.length !== 1) {
    throw new Error(`strict mode violation: locator resolved to ${matches.length} elements`);
  }
  return matches[0]!;
}

export default function App() {
  const [rows, setRows] = useState([
    { id: 'row-1', name: 'Trail mix' },
    { id: 'row-2', name: 'Water bottle' },
  ]);

  return (
    <div style={{ padding: 16 }}>
      <h1>Checkout</h1>
      <ul>
        {rows.map((row) => (
          <li data-testid={row.id} key={row.id}>
            <span>{row.name}</span>
            <button onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}>Remove</button>
          </li>
        ))}
      </ul>
      <button>Add</button>
      <a href="/cart">View cart</a>
      <label>
        <input type="checkbox" aria-label="Gift wrap" />
      </label>
    </div>
  );
}
