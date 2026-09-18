import { StrictMode, useRef, useState } from 'react';

type Player = { id: number; name: string; score: number };

function Leaderboard({ players }: { players: Player[] }) {
  const [, setTick] = useState(0);
  const clickCountRef = useRef(0);

  // FIX: copy before sorting. `ranked` is a new array; `players` is never touched.
  const ranked = [...players].sort((a, b) => b.score - a.score);

  function handleRerank() {
    // FIX: mutate the ref in response to the actual click, not on every render call.
    clickCountRef.current += 1;
    setTick((t) => t + 1);
  }

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
      <button onClick={handleRerank}>Re-rank</button>
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
