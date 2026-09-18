import { createElement, type ReactElement, type ReactNode } from 'react';
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'assignSlots gives mapped children the right slot attribute and leaves unmapped children alone',
    run: async ({ mod, expect }) => {
      const { assignSlots } = mod as {
        assignSlots: (children: unknown, mapping: Record<string, string>) => ReactNode;
      };
      const children = [
        createElement('h3', { key: 'heading' }, 'Plan'),
        createElement('p', { key: 'body' }, 'Body text'),
        createElement('span', { key: 'foot' }, '42 seats'),
      ];
      const result = assignSlots(children, { heading: 'title', foot: 'footer' }) as ReactElement[];
      const byText = new Map(
        result.map((el) => [(el.props as { children?: unknown }).children, el.props as { slot?: string }]),
      );
      expect(byText.get('Plan')?.slot).to.equal('title');
      expect(byText.get('42 seats')?.slot).to.equal('footer');
      expect(byText.get('Body text')?.slot).to.equal(undefined);
    },
  },
  {
    name: 'App renders <XCard> children into the element with the matching slot attributes in the DOM',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const card = screen.getByTestId('card');
      expect(card.querySelector('[slot="title"]')?.textContent).to.equal('Plan');
      expect(card.querySelector('[slot="footer"]')?.textContent).to.equal('42 seats');
      // the unmapped middle child keeps rendering, just with no slot attribute
      expect(card.querySelector('p')?.textContent).to.equal('Body text');
      expect(card.querySelector('p')?.hasAttribute('slot')).to.equal(false);
    },
  },
  {
    name: 'elementProps: className becomes attributes.class, never attributes.className',
    run: async ({ mod, expect }) => {
      const { elementProps } = mod as { elementProps: (p: Record<string, unknown>, i: Record<string, unknown>) => any };
      const result = elementProps({ className: 'foo bar' }, {});
      expect(result.attributes.class).to.equal('foo bar');
      expect(result.attributes.className).to.equal(undefined);
      expect(result.properties.className).to.equal(undefined);
    },
  },
  {
    name: 'elementProps: matching instance property wins over the attribute fallback, any value type',
    run: async ({ mod, expect }) => {
      const { elementProps } = mod as { elementProps: (p: Record<string, unknown>, i: Record<string, unknown>) => any };
      const tags = { value: 3, config: { a: 1 } };
      const result = elementProps({ value: 3, config: { a: 1 } }, { value: 0, config: {} });
      expect(result.properties.value).to.equal(3);
      expect(result.properties.config).to.deep.equal(tags.config);
      expect(result.attributes.value).to.equal(undefined);
    },
  },
  {
    name: 'elementProps: on* function with no matching property becomes a listener keyed by the exact remainder',
    run: async ({ mod, expect }) => {
      const { elementProps } = mod as { elementProps: (p: Record<string, unknown>, i: Record<string, unknown>) => any };
      const handler = () => {};
      const result = elementProps({ 'onrating-change': handler, onXChange: handler }, {});
      expect(result.listeners['rating-change']).to.equal(handler);
      expect(result.listeners.XChange).to.equal(handler);
      expect(result.attributes['onrating-change']).to.equal(undefined);
      expect(result.properties['onrating-change']).to.equal(undefined);
    },
  },
  {
    name: 'elementProps: boolean and nullish handling with no matching property',
    run: async ({ mod, expect }) => {
      const { elementProps } = mod as { elementProps: (p: Record<string, unknown>, i: Record<string, unknown>) => any };
      const result = elementProps({ open: true, hidden: false, note: null, label: 'x' }, {});
      expect(result.attributes.open).to.equal('');
      expect('hidden' in result.attributes).to.equal(false);
      expect('note' in result.attributes).to.equal(false);
      expect(result.attributes.label).to.equal('x');
    },
  },
  {
    name: 'elementProps: a function prop with a non-"on" name and no matching property is omitted entirely',
    run: async ({ mod, expect }) => {
      const { elementProps } = mod as { elementProps: (p: Record<string, unknown>, i: Record<string, unknown>) => any };
      const result = elementProps({ reset: () => {} }, {});
      expect('reset' in result.properties).to.equal(false);
      expect('reset' in result.attributes).to.equal(false);
      expect('reset' in result.listeners).to.equal(false);
    },
  },
];
