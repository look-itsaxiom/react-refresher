import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

function uniqueSuffix(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getDefine(mod: Record<string, unknown>): (suffix: string) => string {
  const define = mod.define;
  if (typeof define !== 'function') {
    throw new Error('expected the module to export a define(suffix) function');
  }
  return define as (suffix: string) => string;
}

export const checks: Check[] = [
  {
    name: 'assigns light DOM children into the title and default slots',
    run: async ({ mod, expect }) => {
      const define = getDefine(mod);
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag);
      const title = document.createElement('span');
      title.slot = 'title';
      title.textContent = 'Q3 report';
      const body = document.createElement('p');
      body.textContent = 'Revenue is up.';
      el.append(title, body);
      document.body.appendChild(el);

      expect(el.shadowRoot, 'expected an open shadow root').to.not.equal(null);
      const titleSlot = el.shadowRoot!.querySelector('slot[name="title"]') as HTMLSlotElement;
      expect(titleSlot, 'expected a slot[name="title"]').to.not.equal(null);
      const assignedTitle = titleSlot.assignedNodes();
      expect(assignedTitle.length).to.equal(1);
      expect(assignedTitle[0]!.textContent).to.equal('Q3 report');
      expect((el as unknown as { titleText: string }).titleText).to.equal('Q3 report');

      const defaultSlot = el.shadowRoot!.querySelector('slot:not([name])') as HTMLSlotElement | null;
      expect(defaultSlot, 'expected an unnamed default slot').to.not.equal(null);
      const assignedDefault = defaultSlot!.assignedNodes();
      expect(assignedDefault.some((node) => node.textContent === 'Revenue is up.')).to.equal(true);

      document.body.removeChild(el);
    },
  },
  {
    name: 'shows fallback footer content and data-has-footer="false" when no footer child is provided',
    run: async ({ mod, expect }) => {
      const define = getDefine(mod);
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag);
      document.body.appendChild(el);

      expect(el.getAttribute('data-has-footer')).to.equal('false');
      const footerSlot = el.shadowRoot!.querySelector('slot[name="footer"]') as HTMLSlotElement;
      expect(footerSlot, 'expected a slot[name="footer"]').to.not.equal(null);
      expect(footerSlot.assignedNodes().length).to.equal(0);
      expect(
        footerSlot.textContent!.trim().length > 0,
        'expected fallback content inside slot[name="footer"]',
      ).to.equal(true);

      document.body.removeChild(el);
    },
  },
  {
    name: 'adding a footer child fires slotchange and flips data-has-footer to "true"',
    run: async ({ mod, expect }) => {
      const define = getDefine(mod);
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag);
      document.body.appendChild(el);
      expect(el.getAttribute('data-has-footer')).to.equal('false');

      const footer = document.createElement('span');
      footer.slot = 'footer';
      footer.textContent = 'Signed off';
      el.appendChild(footer);

      await waitFor(() => {
        expect(el.getAttribute('data-has-footer')).to.equal('true');
      });

      document.body.removeChild(el);
    },
  },
  {
    name: 'the shadow stylesheet scopes with :host, targets slotted content with ::slotted(), and exposes --x-card-accent',
    run: async ({ mod, expect }) => {
      const define = getDefine(mod);
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag);
      document.body.appendChild(el);

      const css = el.shadowRoot!.querySelector('style')?.textContent ?? '';
      expect(css, 'expected a <style> tag inside the shadow root').to.not.equal('');
      expect(css).to.match(/:host(\s|\{|\()/);
      expect(css).to.include('::slotted(');
      expect(css).to.include('--x-card-accent');

      document.body.removeChild(el);
    },
  },
  {
    name: 'internal elements expose a part attribute for ::part() styling from outside',
    run: async ({ mod, expect }) => {
      const define = getDefine(mod);
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag);
      document.body.appendChild(el);

      const partEls = Array.from(el.shadowRoot!.querySelectorAll('[part]'));
      const partNames = partEls.map((node) => node.getAttribute('part'));
      expect(partNames.length >= 2, 'expected at least two elements with a part attribute').to.equal(true);
      expect(partNames.some((name) => (name ?? '').includes('title'))).to.equal(true);

      document.body.removeChild(el);
    },
  },
];
