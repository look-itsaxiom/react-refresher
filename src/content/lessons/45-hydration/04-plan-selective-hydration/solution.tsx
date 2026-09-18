export type Boundary = { id: string; ready: boolean; priority: number };
export type QueuedEvent = { boundaryId: string; type: string };

export function planHydration(boundaries: Boundary[], interactions: string[]): string[] {
  const readyIds = new Set(boundaries.filter((b) => b.ready).map((b) => b.id));

  const interacted: string[] = [];
  const seen = new Set<string>();
  for (const id of interactions) {
    if (readyIds.has(id) && !seen.has(id)) {
      seen.add(id);
      interacted.push(id);
    }
  }

  const rest = boundaries
    .filter((b) => b.ready && !seen.has(b.id))
    .sort((a, b) => a.priority - b.priority)
    .map((b) => b.id);

  return [...interacted, ...rest];
}

export function replayEvents(order: string[], queuedEvents: QueuedEvent[]): QueuedEvent[] {
  const byBoundary = new Map<string, QueuedEvent[]>();
  for (const event of queuedEvents) {
    if (!order.includes(event.boundaryId)) continue;
    const bucket = byBoundary.get(event.boundaryId) ?? [];
    bucket.push(event);
    byBoundary.set(event.boundaryId, bucket);
  }

  const result: QueuedEvent[] = [];
  for (const id of order) {
    const bucket = byBoundary.get(id);
    if (bucket) result.push(...bucket);
  }
  return result;
}

function App() {
  const order = planHydration(
    [
      { id: 'header', ready: true, priority: 1 },
      { id: 'comments', ready: true, priority: 3 },
      { id: 'sidebar', ready: false, priority: 2 },
    ],
    ['comments'],
  );
  return <p data-testid="order">{order.join(' -> ')}</p>;
}

export default App;
