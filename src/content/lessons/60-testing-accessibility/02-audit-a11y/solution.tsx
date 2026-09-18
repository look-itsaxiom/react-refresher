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

// ---- The audit. ----

export type Violation = { rule: string; message: string; selector: string };

function isButtonLike(el: HTMLElement): boolean {
  return el.tagName === 'BUTTON' || el.getAttribute('role') === 'button';
}

function isFormControl(el: HTMLElement): boolean {
  return el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA';
}

function isLink(el: HTMLElement): boolean {
  return el.tagName === 'A' && el.hasAttribute('href');
}

function isFocusable(el: HTMLElement): boolean {
  if (el.tagName === 'BUTTON' || isLink(el) || isFormControl(el)) return true;
  const tabindex = el.getAttribute('tabindex');
  return tabindex !== null && Number(tabindex) >= 0;
}

function isInteractive(el: HTMLElement): boolean {
  return isButtonLike(el) || isLink(el) || isFormControl(el);
}

const LANDMARK_TAGS = new Set(['MAIN', 'NAV', 'HEADER', 'FOOTER', 'ASIDE']);

export function auditA11y(root: HTMLElement): { violations: Violation[] } {
  const violations: Violation[] = [];
  const all = Array.from(root.querySelectorAll<HTMLElement>('*'));

  // image-alt
  for (const el of all) {
    if (el.tagName === 'IMG' && !isHidden(el) && !el.hasAttribute('alt')) {
      violations.push({
        rule: 'image-alt',
        message: 'Image has no alt attribute.',
        selector: selectorFor(el),
      });
    }
  }

  // duplicate-id
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

  // button-name
  for (const el of all) {
    if (isButtonLike(el) && !isHidden(el) && accessibleName(el) === '') {
      violations.push({
        rule: 'button-name',
        message: 'Button has no accessible name (no text content, aria-label, or aria-labelledby).',
        selector: selectorFor(el),
      });
    }
  }

  // label
  for (const el of all) {
    if (isFormControl(el) && !isHidden(el) && accessibleName(el) === '') {
      violations.push({
        rule: 'label',
        message: 'Form control has no associated label (aria-label, aria-labelledby, or <label>).',
        selector: selectorFor(el),
      });
    }
  }

  // heading-order
  let previousLevel: number | null = null;
  for (const el of all) {
    const match = /^H([1-6])$/.exec(el.tagName);
    if (!match || isHidden(el)) continue;
    const level = Number(match[1]);
    if (previousLevel !== null && level > previousLevel + 1) {
      violations.push({
        rule: 'heading-order',
        message: `Heading level jumps from h${previousLevel} to h${level}, skipping a level.`,
        selector: selectorFor(el),
      });
    }
    previousLevel = level;
  }

  // link-name
  for (const el of all) {
    if (isLink(el) && !isHidden(el) && accessibleName(el) === '') {
      violations.push({
        rule: 'link-name',
        message: 'Link has an href but no accessible name.',
        selector: selectorFor(el),
      });
    }
  }

  // aria-hidden-focus (deliberately does NOT skip hidden elements)
  for (const el of all) {
    if (isFocusable(el) && el.closest('[aria-hidden="true"]')) {
      violations.push({
        rule: 'aria-hidden-focus',
        message: 'Focusable element is inside an aria-hidden="true" ancestor, so it is reachable by keyboard but invisible to assistive tech.',
        selector: selectorFor(el),
      });
    }
  }

  // list
  for (const el of all) {
    if (el.tagName === 'LI' && !isHidden(el)) {
      const parentTag = el.parentElement?.tagName;
      if (parentTag !== 'UL' && parentTag !== 'OL') {
        violations.push({
          rule: 'list',
          message: '<li> is not inside a <ul> or <ol>.',
          selector: selectorFor(el),
        });
      }
    }
  }

  // region
  for (const el of all) {
    if (isInteractive(el) && !isHidden(el)) {
      const inLandmark = el.closest('main, nav, header, footer, aside') !== null;
      if (!inLandmark) {
        violations.push({
          rule: 'region',
          message: 'Interactive element is not inside a main/nav/header/footer/aside landmark.',
          selector: selectorFor(el),
        });
      }
    }
  }

  return { violations };
}
