import type { Check } from '../../../types';

type Item = { id: string; category: string; score: number };

/** Freezes an array (so a mutating method called on it throws) while keeping the plain
 * mutable array type, since the functions under test are typed to take `T[]`. */
function frozen<T>(arr: T[]): T[] {
  return Object.freeze(arr) as T[];
}

const items: Item[] = [
  { id: 'a', category: 'fruit', score: 3 },
  { id: 'b', category: 'veg', score: 5 },
  { id: 'c', category: 'fruit', score: 9 },
  { id: 'd', category: 'veg', score: 1 },
];

export const checks: Check[] = [
  {
    name: 'groupByCategory buckets items by category and does not mutate a frozen input array',
    run: async ({ mod, expect }) => {
      const groupByCategory = mod.groupByCategory as (items: Item[]) => Partial<Record<string, Item[]>>;
      const frozenItems = frozen(items.slice());
      const grouped = groupByCategory(frozenItems);
      expect(Object.keys(grouped).sort()).to.deep.equal(['fruit', 'veg']);
      expect(grouped.fruit?.map((i) => i.id)).to.deep.equal(['a', 'c']);
      expect(grouped.veg?.map((i) => i.id)).to.deep.equal(['b', 'd']);
      expect(frozenItems).to.deep.equal(items);
    },
  },
  {
    name: 'topN returns the n highest-scoring items, descending, without mutating a frozen input array',
    run: async ({ mod, expect }) => {
      const topN = mod.topN as (items: Item[], n: number) => Item[];
      const frozenItems = frozen(items.slice());
      const top = topN(frozenItems, 2);
      expect(top.map((i) => i.id)).to.deep.equal(['c', 'b']);
      // input order is untouched
      expect(frozenItems.map((i) => i.id)).to.deep.equal(['a', 'b', 'c', 'd']);
    },
  },
  {
    name: 'topN with n larger than the array just returns everything, sorted',
    run: async ({ mod, expect }) => {
      const topN = mod.topN as (items: Item[], n: number) => Item[];
      const top = topN(frozen(items.slice()), 10);
      expect(top.map((i) => i.id)).to.deep.equal(['c', 'b', 'a', 'd']);
    },
  },
  {
    name: 'uniqueTags unions and sorts two tag lists without duplicates, without mutating frozen inputs',
    run: async ({ mod, expect }) => {
      const uniqueTags = mod.uniqueTags as (a: string[], b: string[]) => string[];
      const a = frozen(['tart', 'sweet']);
      const b = frozen(['sweet', 'savory']);
      const result = uniqueTags(a, b);
      expect(result).to.deep.equal(['savory', 'sweet', 'tart']);
      expect(a).to.deep.equal(['tart', 'sweet']);
      expect(b).to.deep.equal(['sweet', 'savory']);
    },
  },
  {
    name: 'uniqueTags with no overlap still dedupes correctly and handles empty input',
    run: async ({ mod, expect }) => {
      const uniqueTags = mod.uniqueTags as (a: string[], b: string[]) => string[];
      expect(uniqueTags(frozen(['a', 'b']), frozen<string>([]))).to.deep.equal(['a', 'b']);
      expect(uniqueTags(frozen<string>([]), frozen<string>([]))).to.deep.equal([]);
    },
  },
  {
    name: 'makeDeferred returns a promise plus resolve/reject that control it from the outside',
    run: async ({ mod, expect }) => {
      const makeDeferred = mod.makeDeferred as <T>() => {
        promise: Promise<T>;
        resolve: (value: T) => void;
        reject: (reason?: unknown) => void;
      };
      const deferred = makeDeferred<string>();
      expect(deferred.promise).to.be.instanceOf(Promise);
      expect(deferred.resolve).to.be.a('function');
      expect(deferred.reject).to.be.a('function');
      deferred.resolve('done');
      expect(await deferred.promise).to.equal('done');

      const rejected = makeDeferred<string>();
      rejected.reject(new Error('nope'));
      let caught: unknown;
      try {
        await rejected.promise;
      } catch (err) {
        caught = err;
      }
      expect((caught as Error)?.message).to.equal('nope');
    },
  },
];
