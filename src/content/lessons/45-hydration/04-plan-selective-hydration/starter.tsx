export type Boundary = { id: string; ready: boolean; priority: number };
export type QueuedEvent = { boundaryId: string; type: string };

export function planHydration(boundaries: Boundary[], interactions: string[]): string[] {
  // TODO: interacted-with ready boundaries first (deduped, in interaction
  // order), then the rest of the ready boundaries by ascending priority.
  return boundaries.map((b) => b.id);
}

export function replayEvents(order: string[], queuedEvents: QueuedEvent[]): QueuedEvent[] {
  // TODO: group queuedEvents by boundary, in the order boundaries appear in
  // `order`, dropping events for boundaries not in `order`.
  return queuedEvents;
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
