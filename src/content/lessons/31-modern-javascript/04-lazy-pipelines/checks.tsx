import type { Check } from '../../../types';

type PaginateFn = <T>(source: Iterable<T>, size: number) => Generator<T[]>;
type PluckFn = <T, K extends keyof T>(source: Iterable<T>, key: K) => Iterator<T[K]>;

/** Yields 0, 1, 2, ... but throws once it's been pulled past `limit` times, so a check
 * that accidentally materializes "the whole thing" fails fast and loudly instead of
 * spinning forever. */
function* boundedCounter(limit: number): Generator<number> {
  let n = 0;
  while (true) {
    if (n >= limit) {
      throw new Error(`pulled ${limit}+ items — this source should never be fully drained`);
    }
    yield n++;
  }
}

export const checks: Check[] = [
  {
    name: 'paginate chunks a finite array into pages of the requested size, with a shorter final page',
    run: async ({ mod, expect }) => {
      const paginate = mod.paginate as PaginateFn;
      const gen = paginate([1, 2, 3, 4, 5, 6, 7], 3);
      expect(gen.next().value).to.deep.equal([1, 2, 3]);
      expect(gen.next().value).to.deep.equal([4, 5, 6]);
      expect(gen.next().value).to.deep.equal([7]);
      const done = gen.next();
      expect(done.done).to.equal(true);
    },
  },
  {
    name: 'paginate over an empty source yields no pages at all',
    run: async ({ mod, expect }) => {
      const paginate = mod.paginate as PaginateFn;
      const gen = paginate([] as number[], 3);
      const first = gen.next();
      expect(first.done).to.equal(true);
      expect(first.value).to.equal(undefined);
    },
  },
  {
    name: 'paginate never pulls more than one page\'s worth from the source per call — proven with a source that throws if over-pulled',
    run: async ({ mod, expect }) => {
      const paginate = mod.paginate as PaginateFn;
      // The source throws once pulled past 8 items. Two pages of 4 exactly exhausts
      // that budget — an implementation that tries to materialize the whole source up
      // front (or over-fetches per page) hits the throw before returning even the
      // first page.
      const gen = paginate(boundedCounter(8), 4);
      expect(gen.next().value).to.deep.equal([0, 1, 2, 3]);
      expect(gen.next().value).to.deep.equal([4, 5, 6, 7]);
    },
  },
  {
    name: 'pluck lazily maps a field off each item without materializing the whole source first',
    run: async ({ mod, expect }) => {
      const pluck = mod.pluck as PluckFn;
      type Row = { id: number; label: string };
      function* rows(limit: number): Generator<Row> {
        for (const n of boundedCounter(limit)) {
          yield { id: n, label: `row-${n}` };
        }
      }
      const plucked = pluck(rows(5), 'label') as Iterator<string> & { take?: (n: number) => { toArray(): string[] } };
      expect(typeof plucked.next).to.equal('function');
      // Iterator helpers (and plain generators, which inherit them) expose `.take()`.
      expect(typeof plucked.take).to.equal('function');
      const firstTwo = plucked.take!(2).toArray();
      expect(firstTwo).to.deep.equal(['row-0', 'row-1']);
    },
  },
  {
    name: 'PagedList shows nothing until the first click, then reveals pages three at a time, and disables itself once exhausted',
    run: async ({ mod, render, screen, user, act, expect }) => {
      const PagedList = mod.PagedList as React.ComponentType;
      await act(async () => {
        render(<PagedList />);
      });
      expect(screen.queryAllByRole('listitem')).to.have.length(0);

      const button = screen.getByRole('button');
      await user.click(button);
      expect(screen.getAllByRole('listitem').map((el) => el.textContent)).to.deep.equal([
        'Ada',
        'Grace',
        'Katherine',
      ]);
      expect(button.textContent).to.equal('Load more');

      await user.click(button);
      await user.click(button);
      expect(screen.getAllByRole('listitem')).to.have.length(7);
      expect((button as HTMLButtonElement).disabled).to.equal(false);

      await user.click(button);
      expect(screen.getAllByRole('listitem')).to.have.length(7);
      expect(button.textContent).to.equal('No more');
      expect((button as HTMLButtonElement).disabled).to.equal(true);
    },
  },
];
