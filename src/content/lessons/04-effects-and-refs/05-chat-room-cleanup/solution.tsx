import { useEffect, useEffectEvent, useState } from 'react';

/** A fake chat connection. Checks read `room` and `connectToRoom` directly; don't rename them. */
export const room = { subscriberCount: 0, connectCount: 0 };

export function connectToRoom(roomId: string, onMessage: (text: string) => void) {
  room.connectCount += 1;
  room.subscriberCount += 1;
  onMessage(`connected to ${roomId}`);
  return function disconnect() {
    room.subscriberCount -= 1;
  };
}

export default function App() {
  const [roomId, setRoomId] = useState('general');
  const [bumpCount, setBumpCount] = useState(0);

  function notify(text: string) {
    console.log(`[${roomId}] ${text}`);
  }

  // Non-reactive: always sees the latest `notify`, but is not itself a
  // dependency of the effect below, so it can't trigger a reconnect on its own.
  const onConnected = useEffectEvent((text: string) => {
    notify(text);
  });

  useEffect(() => {
    const disconnect = connectToRoom(roomId, onConnected);
    return disconnect;
  }, [roomId]);

  return (
    <div>
      <p data-testid="room">{roomId}</p>
      <button onClick={() => setRoomId((id) => (id === 'general' ? 'random' : 'general'))}>Switch room</button>
      <button onClick={() => setBumpCount((c) => c + 1)}>Bump ({bumpCount})</button>
    </div>
  );
}
