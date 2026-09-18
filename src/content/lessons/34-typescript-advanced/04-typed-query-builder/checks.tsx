import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'builds a single clause for a single filter',
    run: async ({ mod, expect }) => {
      const buildQuery = mod.buildQuery as (schema: unknown, filters: unknown) => string;
      const result = buildQuery({ age: 'number' }, { age: { gt: 3 } });
      expect(result).to.equal('age.gt=3');
    },
  },
  {
    name: 'joins clauses from multiple fields and operators with &',
    run: async ({ mod, expect }) => {
      const buildQuery = mod.buildQuery as (schema: unknown, filters: unknown) => string;
      const result = buildQuery(
        { age: 'number', name: 'string' },
        { age: { eq: 30 }, name: { contains: 'an' } },
      );
      const parts = result.split('&');
      expect(parts).to.have.lengthOf(2);
      expect(parts).to.include('age.eq=30');
      expect(parts).to.include(`name.contains=${encodeURIComponent('an')}`);
    },
  },
  {
    name: 'omits fields that have no filter at all',
    run: async ({ mod, expect }) => {
      const buildQuery = mod.buildQuery as (schema: unknown, filters: unknown) => string;
      const result = buildQuery(
        { age: 'number', name: 'string', active: 'boolean' },
        { age: { gt: 1 } },
      );
      expect(result).to.equal('age.gt=1');
    },
  },
  {
    name: 'includes multiple operators on the same field as separate clauses',
    run: async ({ mod, expect }) => {
      const buildQuery = mod.buildQuery as (schema: unknown, filters: unknown) => string;
      const result = buildQuery({ age: 'number' }, { age: { gt: 1, lt: 10 } });
      const parts = result.split('&');
      expect(parts).to.have.lengthOf(2);
      expect(parts).to.include('age.gt=1');
      expect(parts).to.include('age.lt=10');
    },
  },
  {
    name: 'url-encodes special characters in filter values',
    run: async ({ mod, expect }) => {
      const buildQuery = mod.buildQuery as (schema: unknown, filters: unknown) => string;
      const result = buildQuery({ name: 'string' }, { name: { contains: 'a b&c' } });
      expect(result).to.equal(`name.contains=${encodeURIComponent('a b&c')}`);
    },
  },
  {
    name: 'produces an empty string when no filters are given',
    run: async ({ mod, expect }) => {
      const buildQuery = mod.buildQuery as (schema: unknown, filters: unknown) => string;
      const result = buildQuery({ age: 'number' }, {});
      expect(result).to.equal('');
    },
  },
];
