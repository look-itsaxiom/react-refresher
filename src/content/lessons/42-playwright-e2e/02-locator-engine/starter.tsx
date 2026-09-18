import { useState } from 'react';

export type Step =
  | { kind: 'role'; role: string; name?: string }
  | { kind: 'text'; text: string; exact?: boolean }
  | { kind: 'testId'; id: string }
  | { kind: 'filter'; hasText: string }
  | { kind: 'nth'; index: number }
  | { kind: 'locator'; css: string };
export type Chain = Step[];

// TODO: return a simplified ARIA role for `el`, or null if it has none. See prompt.md for the
// exact rules (explicit `role` attribute, then tag name, then `<input type="...">`).
export function roleOf(_el: Element): string | null {
  return null;
}

// TODO: resolve `chain` against the live DOM under `root`, step by step, re-reading the DOM on
// every call. Right now it always returns every element under root, ignoring the chain entirely.
export function locate(root: Element, _chain: Chain): Element[] {
  return Array.from(root.querySelectorAll('*'));
}

// TODO: throw a Playwright-style strict-mode error when `locate(root, chain)` doesn't resolve to
// exactly one element; otherwise return that element. Right now it just returns the first match
// (or blows up with a confusing error when there are none), the way a naive helper that skips the
// count check would.
export function strictOne(chain: Chain, root: Element): Element {
  return locate(root, chain)[0]!;
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
