// Fixture — don't change this. The checks render it and query it both with your
// `getByRoleLite` and with the real Testing Library `getByRole`, and compare the results.
export default function App() {
  return (
    <div>
      <nav aria-label="Primary">
        <a href="/">Skip to content</a>
      </nav>
      <main>
        <h1>Dashboard</h1>
        <h2>Recent orders</h2>
        <button aria-label="Refresh list">↻</button>
        <div role="button" tabIndex={0}>
          Custom button
        </div>
        <button hidden>Archived</button>
        <button aria-hidden="true">Ghost</button>
        <label htmlFor="email">Email</label>
        <input id="email" />
        <label>
          Search
          <input type="text" />
        </label>
        <input type="checkbox" aria-label="Subscribe" />
        <input type="radio" aria-label="Plan A" name="plan" />
        <select aria-label="Country">
          <option>US</option>
        </select>
        <ul>
          <li>Apple</li>
          <li>Banana</li>
          <li>Cherry</li>
        </ul>
        <dialog open aria-label="Confirm">
          Are you sure?
        </dialog>
      </main>
    </div>
  );
}

type RoleOptions = { name?: string | RegExp; level?: number };

const IMPLICIT_ROLE_BY_TAG: Record<string, string> = {
  NAV: 'navigation',
  MAIN: 'main',
  UL: 'list',
  OL: 'list',
  LI: 'listitem',
  DIALOG: 'dialog',
};

function implicitRole(el: Element): { role: string; level?: number } | null {
  const tag = el.tagName;
  if (tag === 'A') return el.hasAttribute('href') ? { role: 'link' } : null;
  if (tag === 'BUTTON') return { role: 'button' };
  if (/^H[1-6]$/.test(tag)) return { role: 'heading', level: Number(tag[1]) };
  if (tag === 'SELECT') return { role: 'combobox' };
  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();
    if (type === 'checkbox') return { role: 'checkbox' };
    if (type === 'radio') return { role: 'radio' };
    if (type === 'text') return { role: 'textbox' };
    return null;
  }
  return IMPLICIT_ROLE_BY_TAG[tag] ? { role: IMPLICIT_ROLE_BY_TAG[tag] } : null;
}

function resolvedRole(el: Element): { role: string; level?: number } | null {
  const explicit = el.getAttribute('role');
  if (explicit) return { role: explicit, level: implicitRole(el)?.level };
  return implicitRole(el);
}

function isHidden(el: Element): boolean {
  let node: Element | null = el;
  while (node) {
    if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true') return true;
    node = node.parentElement;
  }
  return false;
}

function computeName(el: Element): string {
  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    const text = labelledby
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label?.textContent) return label.textContent.trim();
  }
  const wrappingLabel = el.closest('label');
  if (wrappingLabel?.textContent) return wrappingLabel.textContent.trim();
  return (el.textContent ?? '').trim();
}

function matchesName(actual: string, expected?: string | RegExp): boolean {
  if (expected === undefined) return true;
  if (expected instanceof RegExp) return expected.test(actual);
  return actual === expected;
}

export function getByRoleLite(container: HTMLElement, role: string, options: RoleOptions = {}): HTMLElement {
  const candidates = Array.from(container.querySelectorAll<HTMLElement>('*'));

  const matches = candidates.filter((el) => {
    if (isHidden(el)) return false;
    const resolved = resolvedRole(el);
    if (!resolved || resolved.role !== role) return false;
    if (options.level !== undefined && resolved.level !== options.level) return false;
    return matchesName(computeName(el), options.name);
  });

  const nameSuffix = options.name !== undefined ? ` and name "${String(options.name)}"` : '';
  if (matches.length === 0) {
    throw new Error(`getByRoleLite: found no elements with role "${role}"${nameSuffix}.`);
  }
  if (matches.length > 1) {
    throw new Error(
      `getByRoleLite: found ${matches.length} elements with role "${role}"${nameSuffix}; pass a more specific "name" to disambiguate.`,
    );
  }
  // Length is exactly 1 here — both other cases threw above.
  return matches[0]!;
}
