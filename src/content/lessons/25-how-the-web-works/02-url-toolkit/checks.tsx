import type { Check } from '../../../types';

type Mod = {
  sameOrigin: (a: string, b: string) => boolean;
  resolve: (base: string, relative: string) => string;
  withQuery: (url: string, params: Record<string, string | number | boolean | undefined>) => string;
};

export const checks: Check[] = [
  {
    name: 'sameOrigin treats a default port as equal to no port at all',
    run: async ({ mod, expect }) => {
      const { sameOrigin } = mod as unknown as Mod;
      expect(sameOrigin('https://app.example.com:443/dashboard', 'https://app.example.com/settings')).to.equal(
        true,
      );
      expect(sameOrigin('http://app.example.com:80/a', 'http://app.example.com/b')).to.equal(true);
    },
  },
  {
    name: 'sameOrigin rejects different subdomains, schemes, and non-default ports',
    run: async ({ mod, expect }) => {
      const { sameOrigin } = mod as unknown as Mod;
      expect(sameOrigin('https://app.example.com', 'https://api.example.com'), 'subdomain').to.equal(false);
      expect(sameOrigin('https://example.com', 'http://example.com'), 'scheme').to.equal(false);
      expect(sameOrigin('https://example.com:8443/a', 'https://example.com/a'), 'port').to.equal(false);
    },
  },
  {
    name: 'resolve follows relative segments including ../ against a base path',
    run: async ({ mod, expect }) => {
      const { resolve } = mod as unknown as Mod;
      expect(resolve('https://example.com/docs/guide', '../api/users')).to.equal('https://example.com/api/users');
      expect(resolve('https://example.com/docs/', './guide')).to.equal('https://example.com/docs/guide');
    },
  },
  {
    name: 'resolve ignores the base when the relative URL is already absolute',
    run: async ({ mod, expect }) => {
      const { resolve } = mod as unknown as Mod;
      expect(resolve('https://example.com/docs/guide', 'https://other.com/x')).to.equal('https://other.com/x');
    },
  },
  {
    name: 'withQuery merges new params with existing ones and sorts by key',
    run: async ({ mod, expect }) => {
      const { withQuery } = mod as unknown as Mod;
      const result = withQuery('https://example.com/search?q=react&sort=asc', { page: 2 });
      const url = new URL(result);
      expect([...url.searchParams.keys()]).to.deep.equal(['page', 'q', 'sort']);
      expect(url.searchParams.get('q')).to.equal('react');
      expect(url.searchParams.get('page')).to.equal('2');
    },
  },
  {
    name: 'withQuery drops keys whose value is undefined and preserves the hash',
    run: async ({ mod, expect }) => {
      const { withQuery } = mod as unknown as Mod;
      const result = withQuery('https://example.com/search?q=react&sort=asc#results', { sort: undefined, page: 1 });
      const url = new URL(result);
      expect(url.searchParams.has('sort'), 'sort should have been removed').to.equal(false);
      expect(url.searchParams.get('q')).to.equal('react');
      expect(url.searchParams.get('page')).to.equal('1');
      expect(url.hash).to.equal('#results');
    },
  },
  {
    name: 'withQuery overwrites an existing key rather than duplicating it',
    run: async ({ mod, expect }) => {
      const { withQuery } = mod as unknown as Mod;
      const result = withQuery('https://example.com/search?sort=asc', { sort: 'desc' });
      const url = new URL(result);
      expect(url.searchParams.getAll('sort')).to.deep.equal(['desc']);
    },
  },
];
