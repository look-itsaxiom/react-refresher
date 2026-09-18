import type { Check } from '../../../types';

type Loader<K, V> = {
  load: (key: K) => Promise<V>;
  loadMany: (keys: K[]) => Promise<(V | Error)[]>;
  clear: (key: K) => void;
  clearAll: () => void;
};
type Mod = {
  createLoader: <K, V>(
    batchFn: (keys: K[]) => Promise<(V | Error)[]>,
    options?: { cache?: Map<K, Promise<V>> },
  ) => Loader<K, V>;
};

export const checks: Check[] = [
  {
    name: 'ten synchronous `load` calls in the same tick coalesce into one `batchFn` call, results land at the right keys',
    run: async ({ mod, expect }) => {
      const { createLoader } = mod as unknown as Mod;
      let calls = 0;
      const seenKeyLists: number[][] = [];
      const loader = createLoader<number, string>(async (keys) => {
        calls += 1;
        seenKeyLists.push(keys);
        return keys.map((k) => `value-${k}`);
      });

      const promises = Array.from({ length: 10 }, (_, i) => loader.load(i));
      const results = await Promise.all(promises);

      expect(calls, 'batchFn should be called exactly once for 10 synchronous load() calls').to.equal(1);
      expect(seenKeyLists[0]).to.have.length(10);
      expect(results).to.deep.equal(Array.from({ length: 10 }, (_, i) => `value-${i}`));
    },
  },
  {
    name: 'duplicate keys requested in the same tick are deduplicated in the batchFn call but both callers resolve',
    run: async ({ mod, expect }) => {
      const { createLoader } = mod as unknown as Mod;
      let lastKeys: string[] = [];
      const loader = createLoader<string, string>(async (keys) => {
        lastKeys = keys;
        return keys.map((k) => `v-${k}`);
      });

      const [a, b, c] = await Promise.all([loader.load('x'), loader.load('y'), loader.load('x')]);

      expect(lastKeys, 'batchFn should see each key once').to.deep.equal(['x', 'y']);
      expect(a).to.equal('v-x');
      expect(c).to.equal('v-x');
      expect(b).to.equal('v-y');
    },
  },
  {
    name: 'a second round of load() calls for already-loaded keys hits the cache and makes zero new batchFn calls',
    run: async ({ mod, expect }) => {
      const { createLoader } = mod as unknown as Mod;
      let calls = 0;
      const loader = createLoader<number, number>(async (keys) => {
        calls += 1;
        return keys.map((k) => k * 10);
      });

      await Promise.all([loader.load(1), loader.load(2), loader.load(3)]);
      expect(calls).to.equal(1);

      const second = await Promise.all([loader.load(1), loader.load(2), loader.load(3)]);
      expect(second).to.deep.equal([10, 20, 30]);
      expect(calls, 'no new batchFn call for already-cached keys').to.equal(1);
    },
  },
  {
    name: 'an Error at a given result position rejects only that key, other keys in the same batch still resolve',
    run: async ({ mod, expect }) => {
      const { createLoader } = mod as unknown as Mod;
      const loader = createLoader<string, string>(async (keys) =>
        keys.map((k) => (k === 'bad' ? new Error(`no record for ${k}`) : `ok-${k}`)),
      );

      const goodPromise = loader.load('good');
      const badPromise = loader.load('bad');

      const good = await goodPromise;
      expect(good).to.equal('ok-good');

      let caught: unknown;
      try {
        await badPromise;
      } catch (e) {
        caught = e;
      }
      expect(caught).to.be.instanceOf(Error);
      expect((caught as Error).message).to.equal('no record for bad');
    },
  },
  {
    name: 'loadMany returns values and Error objects in one array, in order, without throwing',
    run: async ({ mod, expect }) => {
      const { createLoader } = mod as unknown as Mod;
      const loader = createLoader<string, string>(async (keys) =>
        keys.map((k) => (k === 'missing' ? new Error('not found') : `found-${k}`)),
      );

      const results = await loader.loadMany(['a', 'missing', 'b']);
      expect(results).to.have.length(3);
      expect(results[0]).to.equal('found-a');
      expect(results[1]).to.be.instanceOf(Error);
      expect(results[2]).to.equal('found-b');
    },
  },
  {
    name: 'clear(key) forces a fresh batchFn call for that key on the next load, clearAll forces it for every key',
    run: async ({ mod, expect }) => {
      const { createLoader } = mod as unknown as Mod;
      let calls = 0;
      const loader = createLoader<string, number>(async (keys) => {
        calls += 1;
        return keys.map(() => calls);
      });

      const first = await loader.load('k');
      expect(first).to.equal(1);
      expect(await loader.load('k')).to.equal(1);
      expect(calls).to.equal(1);

      loader.clear('k');
      expect(await loader.load('k'), 'clear should force a fresh batch').to.equal(2);
      expect(calls).to.equal(2);

      await loader.load('other');
      expect(calls).to.equal(3);

      loader.clearAll();
      await Promise.all([loader.load('k'), loader.load('other')]);
      expect(calls, 'clearAll should force fresh batches for every key').to.equal(4);
    },
  },
];
