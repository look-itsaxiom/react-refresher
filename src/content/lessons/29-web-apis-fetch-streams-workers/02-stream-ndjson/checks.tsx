import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

type Item = { id: number; text: string };
type ReadNdjsonOptions<T> = { signal?: AbortSignal; onItem: (item: T) => void };
type Mod = {
  makeStreamResponse: (chunks: string[]) => Response;
  readNdjson: <T = unknown>(response: Response, options: ReadNdjsonOptions<T>) => Promise<void>;
};

export const checks: Check[] = [
  {
    name: 'renders streamed items incrementally in the UI, not all at once',
    run: async (ctx) => {
      const { render, screen, user, Component, expect } = ctx;
      render(<Component />);
      await user.click(screen.getByRole('button', { name: /start stream/i }));

      await waitFor(() => screen.getByText('first'));
      expect(
        screen.queryByText('third'),
        'the second chunk (with "second" and "third") should not have arrived yet when "first" first appears',
      ).to.equal(null);

      await waitFor(() => screen.getByText('third'));
      expect(screen.getByText('first')).to.exist;
      expect(screen.getByText('second')).to.exist;
      await waitFor(() => expect(screen.getByText(/^done$/)).to.exist);
    },
  },
  {
    name: 'parses a line split across three separate chunks, not just two',
    run: async ({ mod, expect }) => {
      const { readNdjson, makeStreamResponse } = mod as unknown as Mod;
      const items: Item[] = [];
      const response = makeStreamResponse(['{"id":1,', '"text":"al', 'pha"}\n{"id":2,"text":"beta"}\n']);
      await readNdjson<Item>(response, { onItem: (item) => items.push(item) });
      expect(items).to.deep.equal([
        { id: 1, text: 'alpha' },
        { id: 2, text: 'beta' },
      ]);
    },
  },
  {
    name: 'aborting mid-stream stops further items and rejects with an AbortError',
    run: async ({ mod, expect }) => {
      const { readNdjson, makeStreamResponse } = mod as unknown as Mod;
      const controller = new AbortController();
      const items: Item[] = [];
      const response = makeStreamResponse([
        '{"id":1,"text":"first"}\n',
        '{"id":2,"text":"second"}\n',
        '{"id":3,"text":"third"}\n',
      ]);

      let caught: unknown;
      try {
        await readNdjson<Item>(response, {
          signal: controller.signal,
          onItem: (item) => {
            items.push(item);
            controller.abort();
          },
        });
      } catch (err) {
        caught = err;
      }

      expect((caught as Error)?.name).to.equal('AbortError');
      expect(items.length, 'should stop right after the item that triggered the abort').to.equal(1);
    },
  },
  {
    name: 'an already-aborted signal rejects immediately without reading any items',
    run: async ({ mod, expect }) => {
      const { readNdjson, makeStreamResponse } = mod as unknown as Mod;
      const controller = new AbortController();
      controller.abort();
      const items: Item[] = [];
      const response = makeStreamResponse(['{"id":1,"text":"first"}\n']);

      let caught: unknown;
      try {
        await readNdjson<Item>(response, { signal: controller.signal, onItem: (item) => items.push(item) });
      } catch (err) {
        caught = err;
      }

      expect((caught as Error)?.name).to.equal('AbortError');
      expect(items.length).to.equal(0);
    },
  },
];
