import { useEffect, useState } from 'react';

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

  // Recreated on every render, like an inline prop in real code would be.
  function notify(text: string) {
    console.log(`[${roomId}] ${text}`);
  }

  // Bug: no cleanup, so switching rooms never closes the old connection.
  // Bug: `notify` is a dependency, so a re-render that has nothing to do with
  // the room (see the Bump button) still reconnects.
  useEffect(() => {
    connectToRoom(roomId, notify);
  }, [roomId, notify]);

  return (
    <div>
      <p data-testid="room">{roomId}</p>
      <button onClick={() => setRoomId((id) => (id === 'general' ? 'random' : 'general'))}>Switch room</button>
      <button onClick={() => setBumpCount((c) => c + 1)}>Bump ({bumpCount})</button>
    </div>
  );
}
