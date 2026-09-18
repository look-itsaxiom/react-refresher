export type SwState = 'installing' | 'waiting' | 'active' | 'redundant';
export type SwEvent =
  | 'install-ok'
  | 'install-fail'
  | 'activate'
  | 'skip-waiting'
  | 'new-version-found'
  | 'controller-change';
export type UiAction = 'none' | 'show-update-toast' | 'reload';
export type TransitionResult = { state: SwState; uiAction: UiAction };

/**
 * A pure state machine mirroring the service worker lifecycle from the
 * page's point of view. See the prompt's table for every valid
 * (state, event) pair; anything else must throw.
 */
export function transition(state: SwState, event: SwEvent): TransitionResult {
  // TODO: implement the lookup table from the prompt.
  throw new Error('not implemented');
}

export type PrecacheEntry = { url: string; revision: string | null };
export type RevisionDiff = { add: PrecacheEntry[]; remove: PrecacheEntry[]; keep: PrecacheEntry[] };

/** True for a URL with a hashed segment right before its extension. */
export function isHashedUrl(url: string): boolean {
  return /[.-][a-f0-9]{8,}\./i.test(url);
}

/**
 * Diffs two precache manifests into what needs fetching, what needs
 * evicting, and what's already correct.
 */
export function revisionDiff(oldManifest: PrecacheEntry[], newManifest: PrecacheEntry[]): RevisionDiff {
  // TODO: implement using isHashedUrl() for self-revisioned URLs and the
  // `revision` field for everything else.
  throw new Error('not implemented');
}

export default function App() {
  let result: TransitionResult | { error: string };
  try {
    result = transition('waiting', 'skip-waiting');
  } catch (err) {
    result = { error: (err as Error).message };
  }

  let diff: RevisionDiff | { error: string };
  try {
    diff = revisionDiff(
      [{ url: '/index.html', revision: 'abc1' }, { url: '/old.js', revision: null }],
      [{ url: '/index.html', revision: 'abc2' }, { url: '/main.f00dcafe.js', revision: null }],
    );
  } catch (err) {
    diff = { error: (err as Error).message };
  }

  return (
    <div>
      <p>transition('waiting', 'skip-waiting') = {JSON.stringify(result)}</p>
      <p>revisionDiff(...) = {JSON.stringify(diff)}</p>
    </div>
  );
}
