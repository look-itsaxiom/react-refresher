import { StrictMode, useRef, useState } from 'react';

type Player = { id: number; name: string; score: number };

function Leaderboard({ players }: { players: Player[] }) {
  const [, setTick] = useState(0);
  const clickCountRef = useRef(0);

  // BUG: Array.prototype.sort mutates in place. `players` is a prop — this reorders
  // the caller's array, not a private copy of it.
  const ranked = players.sort((a, b) => b.score - a.score);

  // BUG: mutating a ref directly in the render body. This function can run more than
  // once per real commit (StrictMode does this on purpose in development), so this
  // drifts from "number of times the button was actually clicked."
  clickCountRef.current += 1;

  return (
    <div>
      <ol data-testid="ranked">
        {ranked.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ol>
      <ul data-testid="roster">
        {players.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
      <p data-testid="click-count" data-renders={clickCountRef.current}>
        {clickCountRef.current}
      </p>
      <button onClick={() => setTick((t) => t + 1)}>Re-rank</button>
    </div>
  );
}

export default function App() {
  const [players] = useState<Player[]>(() => [
    { id: 1, name: 'Ada', score: 10 },
    { id: 2, name: 'Grace', score: 30 },
    { id: 3, name: 'Alan', score: 20 },
  ]);

  return (
    <StrictMode>
      <Leaderboard players={players} />
    </StrictMode>
  );
}
