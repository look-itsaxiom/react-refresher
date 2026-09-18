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

const TABLE: Record<string, TransitionResult> = {
  'installing:install-ok': { state: 'waiting', uiAction: 'none' },
  'installing:install-fail': { state: 'redundant', uiAction: 'none' },
  'installing:skip-waiting': { state: 'active', uiAction: 'none' },
  'waiting:activate': { state: 'active', uiAction: 'none' },
  'waiting:skip-waiting': { state: 'active', uiAction: 'none' },
  'waiting:new-version-found': { state: 'waiting', uiAction: 'show-update-toast' },
  'active:new-version-found': { state: 'waiting', uiAction: 'show-update-toast' },
  'active:controller-change': { state: 'active', uiAction: 'reload' },
};

/**
 * A pure state machine mirroring the service worker lifecycle from the
 * page's point of view. See the prompt's table for every valid
 * (state, event) pair; anything else must throw.
 */
export function transition(state: SwState, event: SwEvent): TransitionResult {
  const key = `${state}:${event}`;
  const result = TABLE[key];
  if (!result) {
    throw new Error(`invalid transition: ${event} from ${state}`);
  }
  // Return a fresh object each time so callers can't mutate the shared table.
  return { state: result.state, uiAction: result.uiAction };
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
  const oldByUrl = new Map(oldManifest.map((entry) => [entry.url, entry]));
  const newByUrl = new Map(newManifest.map((entry) => [entry.url, entry]));

  const add: PrecacheEntry[] = [];
  const keep: PrecacheEntry[] = [];
  const remove: PrecacheEntry[] = [];

  for (const entry of newManifest) {
    const previous = oldByUrl.get(entry.url);
    if (!previous) {
      add.push(entry);
      continue;
    }
    if (isHashedUrl(entry.url) || previous.revision === entry.revision) {
      keep.push(entry);
    } else {
      add.push(entry);
    }
  }

  for (const entry of oldManifest) {
    if (!newByUrl.has(entry.url)) {
      remove.push(entry);
    }
  }

  return { add, remove, keep };
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
