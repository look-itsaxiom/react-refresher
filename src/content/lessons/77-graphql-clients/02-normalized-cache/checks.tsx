import type { Check } from '../../../types';

type EntityKey = string;
type Ref = { __ref: EntityKey };
type Entities = Record<EntityKey, Record<string, unknown>>;
type Cache = { entities: Entities; listeners: Set<(keys: EntityKey[]) => void> };

type Mod = {
  createCache: () => Cache;
  subscribe: (cache: Cache, listener: (keys: EntityKey[]) => void) => () => void;
  normalize: (
    data: Record<string, unknown>,
    options?: { typenameKey?: string; idOf?: (obj: Record<string, unknown>) => string | number | undefined },
  ) => { entities: Entities; root: Record<string, unknown> };
  mergeEntities: (cache: Cache, entities: Entities) => void;
  denormalize: <T>(cache: Cache, shape: T) => T | undefined;
  writeEntity: (cache: Cache, ref: Ref, patch: Record<string, unknown>) => void;
  evict: (cache: Cache, ref: Ref) => void;
};

export const checks: Check[] = [
  {
    name: 'normalize flattens nested entities into refs and dedupes a repeated entity into one merged record',
    run: async ({ mod, expect }) => {
      const { normalize } = mod as unknown as Mod;
      const data = {
        user: {
          __typename: 'User',
          id: '1',
          name: 'Ada',
          posts: [
            {
              __typename: 'Post',
              id: '9',
              title: 'Hello',
              author: { __typename: 'User', id: '1', name: 'Ada' },
            },
          ],
        },
      };
      const { entities, root } = normalize(data);
      expect(Object.keys(entities).sort()).to.deep.equal(['Post:9', 'User:1']);
      expect(entities['User:1']).to.deep.equal({
        __typename: 'User',
        id: '1',
        name: 'Ada',
        posts: [{ __ref: 'Post:9' }],
      });
      expect(entities['Post:9']!['author']).to.deep.equal({ __ref: 'User:1' });
      expect(root).to.deep.equal({ user: { __ref: 'User:1' } });
    },
  },
  {
    name: 'normalize embeds objects with no resolvable identity instead of turning them into entities',
    run: async ({ mod, expect }) => {
      const { normalize } = mod as unknown as Mod;
      const data = {
        settings: { theme: 'dark', limits: { max: 10 } },
        user: { __typename: 'User', id: '1', name: 'Ada' },
      };
      const { entities, root } = normalize(data);
      expect(Object.keys(entities)).to.deep.equal(['User:1']);
      expect(root['settings']).to.deep.equal({ theme: 'dark', limits: { max: 10 } });
    },
  },
  {
    name: 'two queries sharing an entity stay consistent: writeEntity through one ref updates what the other query denormalizes',
    run: async ({ mod, expect }) => {
      const { createCache, normalize, mergeEntities, denormalize, writeEntity } = mod as unknown as Mod;
      const cache = createCache();

      const queryA = normalize({ profile: { __typename: 'User', id: '1', name: 'Ada Lovelace' } });
      mergeEntities(cache, queryA.entities);
      const queryB = normalize({
        post: { __typename: 'Post', id: '9', title: 'Hi', author: { __typename: 'User', id: '1', name: 'Ada Lovelace' } },
      });
      mergeEntities(cache, queryB.entities);

      writeEntity(cache, { __ref: 'User:1' }, { name: 'Ada King' });

      const resultA = denormalize(cache, queryA.root) as { profile: { name: string } };
      const resultB = denormalize(cache, queryB.root) as { post: { title: string; author: { name: string } } };
      expect(resultA.profile.name).to.equal('Ada King');
      expect(resultB.post.title).to.equal('Hi');
      expect(resultB.post.author.name).to.equal('Ada King');
    },
  },
  {
    name: 'denormalize returns undefined for the whole result when a referenced entity is missing, and evict removes an entity',
    run: async ({ mod, expect }) => {
      const { createCache, normalize, mergeEntities, denormalize, evict } = mod as unknown as Mod;
      const cache = createCache();
      const { entities, root } = normalize({
        user: { __typename: 'User', id: '1', name: 'Ada', best: { __typename: 'User', id: '2', name: 'Grace' } },
      });
      mergeEntities(cache, entities);

      const result = denormalize(cache, root) as { user: { name: string; best: { name: string } } };
      expect(result.user.name).to.equal('Ada');
      expect(result.user.best.name).to.equal('Grace');

      evict(cache, { __ref: 'User:2' });
      expect(denormalize(cache, root)).to.equal(undefined);
    },
  },
  {
    name: 'subscribe notifies listeners once per mutating call, with the changed keys, and unsubscribe stops delivery',
    run: async ({ mod, expect }) => {
      const { createCache, normalize, mergeEntities, subscribe, writeEntity, evict } = mod as unknown as Mod;
      const cache = createCache();
      const calls: EntityKey[][] = [];
      const unsubscribe = subscribe(cache, (keys) => calls.push(keys));

      const { entities } = normalize({
        a: { __typename: 'User', id: '1', name: 'Ada' },
        b: { __typename: 'User', id: '2', name: 'Grace' },
      });
      mergeEntities(cache, entities);
      expect(calls).to.have.lengthOf(1);
      expect(calls[0]!.sort()).to.deep.equal(['User:1', 'User:2']);

      writeEntity(cache, { __ref: 'User:1' }, { name: 'Ada King' });
      expect(calls).to.have.lengthOf(2);
      expect(calls[1]).to.deep.equal(['User:1']);

      unsubscribe();
      evict(cache, { __ref: 'User:2' });
      expect(calls, 'no more calls after unsubscribe').to.have.lengthOf(2);
    },
  },
];
