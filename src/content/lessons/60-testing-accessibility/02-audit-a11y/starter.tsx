// Fixture — don't change this. The checks render it and audit it with your `auditA11y`.
// It's built to trigger exactly one violation per rule below, plus several similar-looking
// elements that are actually fine and must not be flagged.
export default function App() {
  return (
    <div>
      <header>
        <h1>Store</h1>
      </header>
      <nav aria-label="Primary">
        <a href="/cart">Cart</a>
        <a href="/">{/* link-name: href, no text, no aria-label */}</a>
      </nav>
      <main>
        <img src="/hero.jpg" alt="Summer sale banner" />
        <img src="/icon.png" />
        {/* image-alt: no alt attribute at all */}
        <h3>Featured</h3>
        {/* heading-order: jumps from h1 to h3, skipping h2 */}
        <button>Buy</button>
        <button />
        {/* button-name: no text, no aria-label */}
        <div role="button" tabIndex={0}>
          Add to cart
        </div>
        <label htmlFor="qty">Quantity</label>
        <input id="qty" type="number" defaultValue={1} />
        <input type="text" placeholder="Promo code" />
        {/* label: placeholder isn't an accessible name */}
        <ul>
          <li>Free shipping</li>
        </ul>
        <li>Orphan item</li>
        {/* list: <li> outside any <ul>/<ol> */}
        <div id="dup">Section A</div>
        <div id="dup">Section B</div>
        {/* duplicate-id: two elements share id="dup" */}
        <div aria-hidden="true">
          <button>Hidden but focusable</button>
          {/* aria-hidden-focus: focusable inside an aria-hidden ancestor */}
        </div>
      </main>
      <button>Orphan CTA</button>
      {/* region: interactive element outside any landmark */}
      <footer>
        <a href="/privacy">Privacy</a>
      </footer>
    </div>
  );
}

// ---- Provided helpers. Don't change these. ----

/** True if `el` has the `hidden` attribute, or `el` or an ancestor has `aria-hidden="true"`. */
export function isHidden(el: Element): boolean {
  let node: Element | null = el;
  while (node) {
    if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true') return true;
    node = node.parentElement;
  }
  return false;
}

/** Computes an element's accessible name: aria-labelledby, aria-label, <label>, then text content. */
export function accessibleName(el: Element): string {
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

/** Builds a CSS selector that resolves back to `el`. */
export function selectorFor(el: Element): string {
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  const parent = el.parentElement;
  if (!parent) return tag;
  const sameTagSiblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
  const index = sameTagSiblings.indexOf(el) + 1;
  return `${selectorFor(parent)} > ${tag}:nth-of-type(${index})`;
}

// ---- Your work: finish the audit. ----

export type Violation = { rule: string; message: string; selector: string };

export function auditA11y(root: HTMLElement): { violations: Violation[] } {
  const violations: Violation[] = [];
  const all = Array.from(root.querySelectorAll<HTMLElement>('*'));

  // Example rule 1: a simple per-element filter.
  for (const el of all) {
    if (el.tagName === 'IMG' && !isHidden(el) && !el.hasAttribute('alt')) {
      violations.push({
        rule: 'image-alt',
        message: 'Image has no alt attribute.',
        selector: selectorFor(el),
      });
    }
  }

  // Example rule 2: grouping elements by a shared property.
  const byId = new Map<string, HTMLElement[]>();
  for (const el of all) {
    if (el.id) byId.set(el.id, [...(byId.get(el.id) ?? []), el]);
  }
  for (const [id, elements] of byId) {
    if (elements.length > 1) {
      violations.push({
        rule: 'duplicate-id',
        message: `id="${id}" is used by ${elements.length} elements; ids must be unique.`,
        selector: selectorFor(elements[0]!),
      });
    }
  }

  // TODO: button-name — non-hidden <button> or [role="button"] with an empty accessibleName.

  // TODO: label — non-hidden <input>/<select>/<textarea> with an empty accessibleName.

  // TODO: heading-order — a non-hidden heading whose level jumps more than 1 past the
  // previous non-hidden heading's level.

  // TODO: link-name — a non-hidden <a href> with an empty accessibleName.

  // TODO: aria-hidden-focus — a focusable element (button, a[href], input, select, textarea,
  // or tabindex >= 0) with aria-hidden="true" on itself or an ancestor. Do NOT skip hidden
  // elements here — that's the whole point of the rule.

  // TODO: list — a non-hidden <li> whose direct parent isn't <ul> or <ol>.

  // TODO: region — a non-hidden interactive element with no ancestor
  // main/nav/header/footer/aside.

  return { violations };
}
