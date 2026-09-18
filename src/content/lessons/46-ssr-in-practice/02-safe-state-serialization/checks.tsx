import type { Check } from '../../../types';
import type { ComponentType } from 'react';
import type { HydrationOptions } from 'react-dom/client';

type DemoState = { name: string; bio: string; joinedAt: Date; tags: Set<string> };

type Mod = {
  serializeState: (value: unknown) => string;
  deserializeState: (text: string) => unknown;
  renderWithState: <S>(Component: ComponentType<{ state: S }>, state: S) => string;
  bootFromDocument: <S>(container: Element, Component: ComponentType<{ state: S }>, options?: HydrationOptions) => void;
  buildDemoState: (bio?: string) => DemoState;
  Widget: ComponentType<{ state: DemoState }>;
};

const DANGEROUS = "</script><script>alert(1)</script>--><!--  ";

export const checks: Check[] = [
  {
    name: 'serializeState escapes </script>, <!--, and line/paragraph separators',
    run: async ({ mod, expect }) => {
      const { serializeState } = mod as unknown as Mod;
      const out = serializeState({ evil: DANGEROUS });
      expect(out.toLowerCase(), 'must not contain a raw </script>').to.not.include('</script');
      expect(out, 'must not contain a raw <!--').to.not.include('<!--');
      expect(out, 'must not contain a raw U+2028').to.not.include(' ');
      expect(out, 'must not contain a raw U+2029').to.not.include(' ');
    },
  },
  {
    name: 'serializeState/deserializeState round-trip the dangerous string exactly',
    run: async ({ mod, expect }) => {
      const { serializeState, deserializeState } = mod as unknown as Mod;
      const original = { evil: DANGEROUS, note: 'plain text' };
      const roundTripped = deserializeState(serializeState(original)) as typeof original;
      expect(roundTripped.evil).to.equal(DANGEROUS);
      expect(roundTripped.note).to.equal('plain text');
    },
  },
  {
    name: 'round-trips Date, Map, Set, undefined, and bigint (including nested)',
    run: async ({ mod, expect }) => {
      const { serializeState, deserializeState } = mod as unknown as Mod;
      const value = {
        when: new Date('2025-06-15T12:00:00.000Z'),
        counts: new Map<string, number>([['a', 1], ['b', 2]]),
        tags: new Set(['x', 'y']),
        missing: undefined,
        big: 9007199254740993n,
        nested: { insideMap: new Map([['d', new Date('2020-01-01T00:00:00.000Z')]]) },
      };
      const back = deserializeState(serializeState(value)) as typeof value;
      expect(back.when instanceof Date, 'Date should stay a Date').to.equal(true);
      expect(back.when.toISOString()).to.equal(value.when.toISOString());
      expect(back.counts instanceof Map, 'Map should stay a Map').to.equal(true);
      expect(Array.from(back.counts.entries())).to.deep.equal([['a', 1], ['b', 2]]);
      expect(back.tags instanceof Set, 'Set should stay a Set').to.equal(true);
      expect(Array.from(back.tags.values())).to.deep.equal(['x', 'y']);
      expect(back.missing).to.equal(undefined);
      expect(back.big).to.equal(9007199254740993n);
      expect(typeof back.big).to.equal('bigint');
      const innerDate = back.nested.insideMap.get('d');
      expect(innerDate instanceof Date, 'Date nested inside a Map entry should also survive').to.equal(true);
    },
  },
  {
    name: 'renderWithState embeds exactly one real </script> -- none leak from the payload',
    run: async ({ mod, expect }) => {
      const { renderWithState, Widget, buildDemoState } = mod as unknown as Mod;
      const state = buildDemoState(DANGEROUS);
      const html = renderWithState(Widget, state);
      const closingTags = html.toLowerCase().match(/<\/script>/g) ?? [];
      expect(closingTags.length, 'the only </script> should be the tag\'s own closing tag').to.equal(1);
      expect(html, 'server-rendered markup should still be present').to.include('app-root');
    },
  },
  {
    name: 'bootFromDocument hydrates from the embedded script with zero recoverable errors',
    run: async ({ mod, expect, act }) => {
      const { renderWithState, bootFromDocument, Widget, buildDemoState } = mod as unknown as Mod;
      const state = buildDemoState('Loves React.');
      const html = renderWithState(Widget, state);
      document.body.innerHTML = html;
      const container = document.getElementById('app-root');
      if (!container) throw new Error('expected #app-root to exist after setting innerHTML');

      const recoverableErrors: unknown[] = [];
      // Wrapped in act() -- hydration work (and, on a buggy solution, any error it
      // throws) needs to flush and surface here rather than escaping asynchronously.
      await act(async () => {
        bootFromDocument(container, Widget, {
          onRecoverableError: (error) => recoverableErrors.push(error),
        });
      });

      expect(recoverableErrors.length, 'hydration should not report any recoverable errors').to.equal(0);
      expect(container.textContent).to.include('Ada');
      expect(container.textContent).to.include('Loves React.');
      expect(container.textContent).to.include('admin');
    },
  },
];
