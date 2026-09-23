import { useCallback, useEffect, useState } from 'react';
import {
  client,
  fieldStorageKey,
  gc,
  mergeEntity,
  PAGE_SIZE,
  readEntity,
  readRootField,
  subscribe,
  writeRootField,
  evict,
  type Connection,
  type Edge,
  type Ref,
  type Task,
  type RawConnection,
} from './mini-client';

// Re-exported so this exercise's checks can inspect the cache directly (e.g. after a
// delete, or to grade the `keyFields` case) without reaching into a private module.
export { client, mergeEntity, linkStats } from './mini-client';

// TODO: a typePolicies-style field merge for a plain list field keyed by `projectId` only
// (real Apollo: `typePolicies: { Project: { fields: { tasks: { keyArgs: ['projectId'],
// merge: mergeWithKeyArgs } } } }`). `existing`/`incoming` are ref arrays — append `incoming`
// onto `existing` (or just return `incoming` if there's no `existing` yet), dropping any
// ref from `incoming` whose `__ref` already appears in `existing` (a page re-fetch
// shouldn't duplicate an id you already have).
export function mergeWithKeyArgs(existing: Ref[] | undefined, incoming: Ref[]): Ref[] {
  return incoming;
}

// TODO: the merge Apollo's own `relayStylePagination()` helper produces for an `edges` /
// `pageInfo` connection field.
// - `edges`: append `incoming.edges` onto `existing?.edges`, deduping by `node.__ref`ish
//   identity — use each edge's `cursor` (unique per node here) as the dedupe key.
// - `pageInfo`: keep `existing`'s info where `incoming` doesn't have anything newer to say
//   (there's no `startCursor`/`hasPreviousPage` here, so this is just `endCursor` and
//   `hasNextPage`) — return `incoming.pageInfo` as the new pageInfo; the *caller* fetched
//   the next page, so its `pageInfo` is always the freshest one.
export function relayStyleMerge(existing: Connection | undefined, incoming: Connection): Connection {
  return incoming;
}

/** Fetches one page from the fake link and normalizes each returned task into the cache,
 * returning a `Connection` whose edges hold refs (not embedded objects) — fully implemented. */
async function fetchPage(projectId: string, after: string | null): Promise<Connection> {
  const result = await client.link({ document: { operation: 'ProjectTasks' }, variables: { projectId, first: PAGE_SIZE, after } });
  const raw = result.data?.tasksConnection as RawConnection;
  const edges: Edge[] = raw.edges.map((edge) => ({ cursor: edge.cursor, node: mergeEntity(client.cache, edge.node) }));
  return { edges, pageInfo: raw.pageInfo };
}

// TODO: useTasksConnection(projectId) — pagination on top of the ROOT_QUERY field storage
// in mini-client.ts.
// - Compute `storageKey = fieldStorageKey('tasksConnection', ['projectId'], { projectId })`
//   — this is what gives two different `projectId`s two different storage slots (the
//   "isolation" this exercise's checks grade).
// - On mount (and whenever `projectId` changes): if `readRootField(client.cache, storageKey)`
//   is already populated, do nothing; otherwise `fetchPage(projectId, null)` (given, below)
//   and `writeRootField(cache, storageKey, relayStyleMerge(undefined, page))`.
// - `fetchMore()`: bail if the currently stored `pageInfo.hasNextPage` is false. Otherwise
//   `fetchPage(projectId, currentPageInfo.endCursor)` and
//   `writeRootField(cache, storageKey, relayStyleMerge(current, freshPage))`.
// - Subscribe (via `subscribe`, from mini-client.ts) so a write from *this* hook or another
//   mounted instance for the same `projectId` re-renders this one too.
// - Derive `items` by mapping the stored connection's `edges` through `readEntity`.
export function useTasksConnection(projectId: string): { items: Task[]; hasNextPage: boolean; fetchMore: () => void } {
  void projectId;
  return { items: [], hasNextPage: false, fetchMore: () => {} };
}

// TODO: deleteTask(id) — call the `DeleteTask` mutation through `client.link`, then `evict`
// the `Task:${id}` entity and run `gc(client.cache)` so it disappears from every stored
// connection page it was part of (not just from the "entities" map).
export async function deleteTask(id: string): Promise<void> {
  void id;
}

// --- Demo components. ---

function ProjectTaskList({ projectId, testId }: { projectId: string; testId: string }) {
  const { items, hasNextPage, fetchMore } = useTasksConnection(projectId);
  return (
    <div data-testid={testId}>
      <ul>
        {items.map((task) => (
          <li key={task.id} data-testid={`${testId}-${task.id}`}>
            {task.title}
            <button onClick={() => void deleteTask(task.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <button onClick={fetchMore} disabled={!hasNextPage} data-testid={`${testId}-load-more`}>
        {hasNextPage ? 'Load more' : 'No more tasks'}
      </button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <ProjectTaskList projectId="p1" testId="project-p1" />
      <ProjectTaskList projectId="p2" testId="project-p2" />
    </div>
  );
}
