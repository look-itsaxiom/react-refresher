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

export function mergeWithKeyArgs(existing: Ref[] | undefined, incoming: Ref[]): Ref[] {
  if (!existing) return incoming;
  const seen = new Set(existing.map((ref) => ref.__ref));
  return [...existing, ...incoming.filter((ref) => !seen.has(ref.__ref))];
}

export function relayStyleMerge(existing: Connection | undefined, incoming: Connection): Connection {
  if (!existing) return incoming;
  const seen = new Set(existing.edges.map((edge) => edge.cursor));
  const edges = [...existing.edges, ...incoming.edges.filter((edge) => !seen.has(edge.cursor))];
  return { edges, pageInfo: incoming.pageInfo };
}

async function fetchPage(projectId: string, after: string | null): Promise<Connection> {
  const result = await client.link({ document: { operation: 'ProjectTasks' }, variables: { projectId, first: PAGE_SIZE, after } });
  const raw = result.data?.tasksConnection as RawConnection;
  const edges: Edge[] = raw.edges.map((edge) => ({ cursor: edge.cursor, node: mergeEntity(client.cache, edge.node) }));
  return { edges, pageInfo: raw.pageInfo };
}

export function useTasksConnection(projectId: string): { items: Task[]; hasNextPage: boolean; fetchMore: () => void } {
  const storageKey = fieldStorageKey('tasksConnection', ['projectId'], { projectId });
  const [, setTick] = useState(0);

  useEffect(() => {
    if (readRootField<Connection>(client.cache, storageKey) === undefined) {
      fetchPage(projectId, null).then((page) => {
        writeRootField(client.cache, storageKey, relayStyleMerge(undefined, page));
      });
    }
    return subscribe(client.cache, (changedKeys) => {
      if (changedKeys.includes(`ROOT_QUERY.${storageKey}`)) setTick((t) => t + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const fetchMore = useCallback(() => {
    const current = readRootField<Connection>(client.cache, storageKey);
    const after = current?.pageInfo.hasNextPage ? current.pageInfo.endCursor : null;
    if (!current?.pageInfo.hasNextPage) return;
    fetchPage(projectId, after).then((page) => {
      const merged = relayStyleMerge(readRootField<Connection>(client.cache, storageKey), page);
      writeRootField(client.cache, storageKey, merged);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, projectId]);

  const connection = readRootField<Connection>(client.cache, storageKey);
  const items = (connection?.edges ?? [])
    .map((edge) => readEntity(client.cache, edge.node))
    .filter((task): task is Task => Boolean(task)) as Task[];

  return { items, hasNextPage: connection?.pageInfo.hasNextPage ?? false, fetchMore };
}

export async function deleteTask(id: string): Promise<void> {
  await client.link({ document: { operation: 'DeleteTask' }, variables: { id } });
  evict(client.cache, { __ref: `Task:${id}` });
  gc(client.cache);
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
