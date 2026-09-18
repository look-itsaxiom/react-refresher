import type { Check } from '../../../types';

// A complete, correct auditA11y — the same rules from the previous exercise's solution — used
// here to grade the fix. This is intentionally not imported from the previous exercise: each
// exercise's checks are self-contained.

type Violation = { rule: string; message: string; selector: string };

function isHidden(el: Element): boolean {
  let node: Element | null = el;
  while (node) {
    if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true') return true;
    node = node.parentElement;
  }
  return false;
}

function accessibleName(el: Element): string {
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

function selectorFor(el: Element): string {
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  const parent = el.parentElement;
  if (!parent) return tag;
  const sameTagSiblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
  const index = sameTagSiblings.indexOf(el) + 1;
  return `${selectorFor(parent)} > ${tag}:nth-of-type(${index})`;
}

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

function auditA11y(root: HTMLElement): { violations: Violation[] } {
  const violations: Violation[] = [];
  const all = Array.from(root.querySelectorAll<HTMLElement>('*'));

  for (const el of all) {
    if (el.tagName === 'IMG' && !isHidden(el) && !el.hasAttribute('alt')) {
      violations.push({ rule: 'image-alt', message: 'Image has no alt attribute.', selector: selectorFor(el) });
    }
  }

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

  for (const el of all) {
    if (isButtonLike(el) && !isHidden(el) && accessibleName(el) === '') {
      violations.push({ rule: 'button-name', message: 'Button has no accessible name.', selector: selectorFor(el) });
    }
  }

  for (const el of all) {
    if (isFormControl(el) && !isHidden(el) && accessibleName(el) === '') {
      violations.push({ rule: 'label', message: 'Form control has no associated label.', selector: selectorFor(el) });
    }
  }

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

  for (const el of all) {
    if (isLink(el) && !isHidden(el) && accessibleName(el) === '') {
      violations.push({ rule: 'link-name', message: 'Link has an href but no accessible name.', selector: selectorFor(el) });
    }
  }

  for (const el of all) {
    if (isFocusable(el) && el.closest('[aria-hidden="true"]')) {
      violations.push({
        rule: 'aria-hidden-focus',
        message: 'Focusable element is inside an aria-hidden="true" ancestor.',
        selector: selectorFor(el),
      });
    }
  }

  for (const el of all) {
    if (el.tagName === 'LI' && !isHidden(el)) {
      const parentTag = el.parentElement?.tagName;
      if (parentTag !== 'UL' && parentTag !== 'OL') {
        violations.push({ rule: 'list', message: '<li> is not inside a <ul> or <ol>.', selector: selectorFor(el) });
      }
    }
  }

  for (const el of all) {
    if (isInteractive(el) && !isHidden(el)) {
      const inLandmark = el.closest('main, nav, header, footer, aside') !== null;
      if (!inLandmark) {
        violations.push({
          rule: 'region',
          message: 'Interactive element is not inside a landmark.',
          selector: selectorFor(el),
        });
      }
    }
  }

  return { violations };
}

export const checks: Check[] = [
  {
    name: 'the audit reports zero violations, mounted inside a <main> landmark',
    run: ({ render, expect, Component }) => {
      const { container } = render(
        <main>
          <Component />
        </main>,
      );
      const { violations } = auditA11y(container);
      expect(violations, JSON.stringify(violations)).to.have.length(0);
    },
  },
  {
    name: 'the avatar image has an accessible name of "Jordan Lee"',
    run: ({ render, within, expect, Component }) => {
      const { container } = render(<Component />);
      within(container).getByRole('img', { name: 'Jordan Lee' });
      expect(true).to.equal(true);
    },
  },
  {
    name: 'the icon-only edit button has an accessible name of "Edit profile"',
    run: ({ render, within, expect, Component }) => {
      const { container } = render(<Component />);
      within(container).getByRole('button', { name: 'Edit profile' });
      expect(true).to.equal(true);
    },
  },
  {
    name: 'the display name input has a real associated label',
    run: ({ render, expect, Component }) => {
      const { getByLabelText } = render(<Component />);
      expect(getByLabelText('Display name')).to.exist;
    },
  },
  {
    name: 'the Twitter link has an accessible name',
    run: ({ render, within, expect, Component }) => {
      const { container } = render(<Component />);
      within(container).getByRole('link', { name: 'Jordan Lee on Twitter' });
      expect(true).to.equal(true);
    },
  },
  {
    name: 'the Follow button is reachable by role query, not hidden by a decorative wrapper',
    run: ({ render, within, expect, Component }) => {
      const { container } = render(<Component />);
      within(container).getByRole('button', { name: 'Follow' });
      expect(true).to.equal(true);
    },
  },
];
