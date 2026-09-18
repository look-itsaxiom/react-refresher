import type { Check } from '../../../types';

type Violation = { rule: string; message: string; selector: string };
type AuditA11y = (root: HTMLElement) => { violations: Violation[] };

const EXPECTED_RULES = [
  'image-alt',
  'button-name',
  'label',
  'heading-order',
  'duplicate-id',
  'link-name',
  'aria-hidden-focus',
  'list',
  'region',
];

function getAudit({ mod }: { mod: Record<string, unknown> }): AuditA11y {
  const fn = mod.auditA11y;
  if (typeof fn !== 'function') {
    throw new Error('Expected the module to export a function named `auditA11y`.');
  }
  return fn as AuditA11y;
}

function rulesOf(violations: Violation[]): string[] {
  return violations.map((v) => v.rule).sort();
}

export const checks: Check[] = [
  {
    name: 'finds exactly one violation for each of the nine rules, and nothing else',
    run: ({ render, expect, Component, mod }) => {
      const auditA11y = getAudit({ mod });
      const { container } = render(<Component />);
      const { violations } = auditA11y(container);
      expect(rulesOf(violations)).to.deep.equal([...EXPECTED_RULES].sort());
    },
  },
  {
    name: 'image-alt: flags the <img> with no alt attribute, not the one with alt text',
    run: ({ render, expect, Component, mod }) => {
      const auditA11y = getAudit({ mod });
      const { container } = render(<Component />);
      const { violations } = auditA11y(container);
      const hits = violations.filter((v) => v.rule === 'image-alt');
      expect(hits).to.have.length(1);
      const el = container.querySelector(hits[0]!.selector);
      expect(el?.getAttribute('src')).to.equal('/icon.png');
    },
  },
  {
    name: 'button-name and region do not both fire on the same element by accident',
    run: ({ render, expect, Component, mod }) => {
      const auditA11y = getAudit({ mod });
      const { container } = render(<Component />);
      const { violations } = auditA11y(container);
      const buttonNameHits = violations.filter((v) => v.rule === 'button-name');
      expect(buttonNameHits).to.have.length(1);
      const el = container.querySelector(buttonNameHits[0]!.selector);
      expect(el?.tagName).to.equal('BUTTON');
      expect((el?.textContent ?? '').trim()).to.equal('');
      const regionOnSameEl = violations.some(
        (v) => v.rule === 'region' && v.selector === buttonNameHits[0]!.selector,
      );
      expect(regionOnSameEl).to.equal(false);
    },
  },
  {
    name: 'label: flags the unlabeled promo input, not the labeled quantity input',
    run: ({ render, expect, Component, mod }) => {
      const auditA11y = getAudit({ mod });
      const { container } = render(<Component />);
      const { violations } = auditA11y(container);
      const hits = violations.filter((v) => v.rule === 'label');
      expect(hits).to.have.length(1);
      const el = container.querySelector(hits[0]!.selector) as HTMLInputElement | null;
      expect(el?.getAttribute('placeholder')).to.equal('Promo code');
    },
  },
  {
    name: 'heading-order: names the actual levels involved and points at the offending heading',
    run: ({ render, expect, Component, mod }) => {
      const auditA11y = getAudit({ mod });
      const { container } = render(<Component />);
      const { violations } = auditA11y(container);
      const hits = violations.filter((v) => v.rule === 'heading-order');
      expect(hits).to.have.length(1);
      expect(hits[0]!.message).to.match(/1/).and.to.match(/3/);
      const el = container.querySelector(hits[0]!.selector);
      expect(el?.tagName).to.equal('H3');
    },
  },
  {
    name: 'link-name and list flag the right elements',
    run: ({ render, expect, Component, mod }) => {
      const auditA11y = getAudit({ mod });
      const { container } = render(<Component />);
      const { violations } = auditA11y(container);
      const linkHits = violations.filter((v) => v.rule === 'link-name');
      expect(linkHits).to.have.length(1);
      const linkEl = container.querySelector(linkHits[0]!.selector);
      expect(linkEl?.getAttribute('href')).to.equal('/');

      const listHits = violations.filter((v) => v.rule === 'list');
      expect(listHits).to.have.length(1);
      const listEl = container.querySelector(listHits[0]!.selector);
      expect((listEl?.textContent ?? '').trim()).to.equal('Orphan item');
    },
  },
  {
    name: 'aria-hidden-focus: flags the button hidden by an aria-hidden ancestor, without also flagging it as button-name or region',
    run: ({ render, expect, Component, mod }) => {
      const auditA11y = getAudit({ mod });
      const { container } = render(<Component />);
      const { violations } = auditA11y(container);
      const hits = violations.filter((v) => v.rule === 'aria-hidden-focus');
      expect(hits).to.have.length(1);
      const el = container.querySelector(hits[0]!.selector);
      expect((el?.textContent ?? '').trim()).to.equal('Hidden but focusable');
      const sameSelectorOtherRule = violations.some(
        (v) => v.rule !== 'aria-hidden-focus' && v.selector === hits[0]!.selector,
      );
      expect(sameSelectorOtherRule).to.equal(false);
    },
  },
  {
    name: 'duplicate-id: names the shared id and the count',
    run: ({ render, expect, Component, mod }) => {
      const auditA11y = getAudit({ mod });
      const { container } = render(<Component />);
      const { violations } = auditA11y(container);
      const hits = violations.filter((v) => v.rule === 'duplicate-id');
      expect(hits).to.have.length(1);
      expect(hits[0]!.message).to.match(/dup/).and.to.match(/2/);
    },
  },
  {
    name: 'region: flags the button outside any landmark, not the ones inside main/nav/footer',
    run: ({ render, expect, Component, mod }) => {
      const auditA11y = getAudit({ mod });
      const { container } = render(<Component />);
      const { violations } = auditA11y(container);
      const hits = violations.filter((v) => v.rule === 'region');
      expect(hits).to.have.length(1);
      const el = container.querySelector(hits[0]!.selector);
      expect((el?.textContent ?? '').trim()).to.equal('Orphan CTA');
    },
  },
];
