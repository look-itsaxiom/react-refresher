import type { Check } from '../../../types';

type SwState = 'installing' | 'waiting' | 'active' | 'redundant';
type SwEvent = 'install-ok' | 'install-fail' | 'activate' | 'skip-waiting' | 'new-version-found' | 'controller-change';
type UiAction = 'none' | 'show-update-toast' | 'reload';
type TransitionResult = { state: SwState; uiAction: UiAction };
type PrecacheEntry = { url: string; revision: string | null };
type RevisionDiff = { add: PrecacheEntry[]; remove: PrecacheEntry[]; keep: PrecacheEntry[] };

type Mod = {
  transition: (state: SwState, event: SwEvent) => TransitionResult;
  revisionDiff: (oldManifest: PrecacheEntry[], newManifest: PrecacheEntry[]) => RevisionDiff;
};

function urls(entries: PrecacheEntry[]): string[] {
  return entries.map((e) => e.url).sort();
}

export const checks: Check[] = [
  {
    name: 'a fresh install completing parks in waiting, with no UI action',
    run: async ({ mod, expect }) => {
      const { transition } = mod as unknown as Mod;
      expect(transition('installing', 'install-ok')).to.deep.equal({ state: 'waiting', uiAction: 'none' });
    },
  },
  {
    name: 'an install failure is terminal: redundant, no UI action',
    run: async ({ mod, expect }) => {
      const { transition } = mod as unknown as Mod;
      expect(transition('installing', 'install-fail')).to.deep.equal({ state: 'redundant', uiAction: 'none' });
    },
  },
  {
    name: 'a natural activation (old tabs already closed) needs no reload prompt',
    run: async ({ mod, expect }) => {
      const { transition } = mod as unknown as Mod;
      expect(transition('waiting', 'activate')).to.deep.equal({ state: 'active', uiAction: 'none' });
    },
  },
  {
    name: 'a new version arriving while one is already active parks the new one and shows a toast',
    run: async ({ mod, expect }) => {
      const { transition } = mod as unknown as Mod;
      expect(transition('active', 'new-version-found')).to.deep.equal({
        state: 'waiting',
        uiAction: 'show-update-toast',
      });
    },
  },
  {
    name: 'a second, newer version replacing an already-waiting one re-fires the toast without advancing state',
    run: async ({ mod, expect }) => {
      const { transition } = mod as unknown as Mod;
      expect(transition('waiting', 'new-version-found')).to.deep.equal({
        state: 'waiting',
        uiAction: 'show-update-toast',
      });
    },
  },
  {
    name: 'skip-waiting activates immediately but does not itself trigger a reload',
    run: async ({ mod, expect }) => {
      const { transition } = mod as unknown as Mod;
      expect(transition('waiting', 'skip-waiting')).to.deep.equal({ state: 'active', uiAction: 'none' });
    },
  },
  {
    name: 'only the later controller-change event triggers the reload, following skip-waiting',
    run: async ({ mod, expect }) => {
      const { transition } = mod as unknown as Mod;
      const afterSkip = transition('waiting', 'skip-waiting');
      expect(afterSkip.state).to.equal('active');
      const afterControllerChange = transition(afterSkip.state, 'controller-change');
      expect(afterControllerChange).to.deep.equal({ state: 'active', uiAction: 'reload' });
    },
  },
  {
    name: 'redundant is a dead end: any event against it is invalid',
    run: async ({ mod, expect }) => {
      const { transition } = mod as unknown as Mod;
      expect(() => transition('redundant', 'activate')).to.throw();
      expect(() => transition('redundant', 'install-ok')).to.throw();
    },
  },
  {
    name: 'an out-of-order event (activating before installing finished) is invalid',
    run: async ({ mod, expect }) => {
      const { transition } = mod as unknown as Mod;
      expect(() => transition('installing', 'activate')).to.throw();
      expect(() => transition('installing', 'controller-change')).to.throw();
    },
  },
  {
    name: 'revisionDiff treats a hashed URL as self-revisioned, ignoring its revision field',
    run: async ({ mod, expect }) => {
      const { revisionDiff } = mod as unknown as Mod;
      const oldManifest: PrecacheEntry[] = [{ url: '/assets/main.a1b2c3d4.js', revision: null }];
      const newManifest: PrecacheEntry[] = [{ url: '/assets/main.a1b2c3d4.js', revision: 'ignored-but-different' }];
      const diff = revisionDiff(oldManifest, newManifest);
      expect(urls(diff.keep), 'the hash in the URL is the revision -- same URL means keep it').to.deep.equal([
        '/assets/main.a1b2c3d4.js',
      ]);
      expect(diff.add).to.have.length(0);
      expect(diff.remove).to.have.length(0);
    },
  },
  {
    name: 'revisionDiff adds an unhashed URL whose revision changed, without also flagging it as removed',
    run: async ({ mod, expect }) => {
      const { revisionDiff } = mod as unknown as Mod;
      const diff = revisionDiff(
        [{ url: '/index.html', revision: 'v1' }],
        [{ url: '/index.html', revision: 'v2' }],
      );
      expect(urls(diff.add)).to.deep.equal(['/index.html']);
      expect(diff.remove).to.have.length(0);
      expect(diff.keep).to.have.length(0);
    },
  },
  {
    name: 'revisionDiff keeps an unhashed URL whose revision is unchanged',
    run: async ({ mod, expect }) => {
      const { revisionDiff } = mod as unknown as Mod;
      const diff = revisionDiff(
        [{ url: '/offline.html', revision: 'v1' }],
        [{ url: '/offline.html', revision: 'v1' }],
      );
      expect(urls(diff.keep)).to.deep.equal(['/offline.html']);
      expect(diff.add).to.have.length(0);
      expect(diff.remove).to.have.length(0);
    },
  },
  {
    name: 'revisionDiff removes a URL dropped from the new manifest and adds one newly introduced',
    run: async ({ mod, expect }) => {
      const { revisionDiff } = mod as unknown as Mod;
      const diff = revisionDiff(
        [{ url: '/old-page.html', revision: 'v1' }],
        [{ url: '/new-page.html', revision: 'v1' }],
      );
      expect(urls(diff.remove)).to.deep.equal(['/old-page.html']);
      expect(urls(diff.add)).to.deep.equal(['/new-page.html']);
      expect(diff.keep).to.have.length(0);
    },
  },
  {
    name: 'revisionDiff partitions a mixed manifest correctly across add, remove, and keep',
    run: async ({ mod, expect }) => {
      const { revisionDiff } = mod as unknown as Mod;
      const oldManifest: PrecacheEntry[] = [
        { url: '/index.html', revision: 'v1' },
        { url: '/assets/main.deadbeef01.js', revision: null },
        { url: '/offline.html', revision: 'v1' },
        { url: '/retired.html', revision: 'v1' },
      ];
      const newManifest: PrecacheEntry[] = [
        { url: '/index.html', revision: 'v2' },
        { url: '/assets/main.deadbeef01.js', revision: null },
        { url: '/offline.html', revision: 'v1' },
        { url: '/assets/new-feature.cafebabe02.js', revision: null },
      ];
      const diff = revisionDiff(oldManifest, newManifest);
      expect(urls(diff.add)).to.deep.equal(['/assets/new-feature.cafebabe02.js', '/index.html']);
      expect(urls(diff.remove)).to.deep.equal(['/retired.html']);
      expect(urls(diff.keep)).to.deep.equal(['/assets/main.deadbeef01.js', '/offline.html']);
    },
  },
];
