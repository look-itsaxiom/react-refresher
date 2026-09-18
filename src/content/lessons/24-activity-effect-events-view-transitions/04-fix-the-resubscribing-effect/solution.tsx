import { useState, useEffect, useEffectEvent } from 'react';

type Listener = (message: string) => void;

class FakeConnection {
  private listeners: Listener[] = [];
  onMessage(listener: Listener) {
    this.listeners.push(listener);
  }
  emit(message: string) {
    this.listeners.forEach((listener) => listener(message));
  }
  disconnect() {}
}

// Module-level so the exercise (and its checks) can observe how many
// connections get created over the component's lifetime.
export const connections: FakeConnection[] = [];

function createConnection(_roomId: string) {
  const connection = new FakeConnection();
  connections.push(connection);
  return connection;
}

export default function ChatRoom() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [log, setLog] = useState<string[]>([]);

  const onMessage = useEffectEvent((message: string) => {
    setLog((prev) => [...prev, `[${theme}] ${message}`]); // always the latest theme
  });

  useEffect(() => {
    const connection = createConnection('general');
    connection.onMessage((message) => onMessage(message));
    return () => connection.disconnect();
  }, []); // no reactive dependencies: this room never changes

  return (
    <div>
      <ul data-testid="log">
        {log.map((entry, i) => (
          <li key={i}>{entry}</li>
        ))}
      </ul>
      <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
        Toggle theme
      </button>
      <button onClick={() => connections[connections.length - 1]?.emit('New message')}>
        Simulate incoming message
      </button>
    </div>
  );
}
