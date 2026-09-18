import { useEffect, useRef, useState } from 'react';

export type Player = { name: string; score: number };

const SAMPLE_PLAYERS: Player[] = [
  { name: 'Amara', score: 12 },
  { name: 'Bo', score: 30 },
  { name: 'Chidi', score: 21 },
];

export function Leaderboard({ players }: { players: Player[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [round, setRound] = useState(1);
  const [isCompact, setIsCompact] = useState(false);

  // FIX 3: measure in an effect, after the DOM node exists, and keep the
  // result in state instead of reading `.current` during render.
  useEffect(() => {
    const node = containerRef.current;
    if (node) {
      setIsCompact(node.offsetWidth < 480);
    }
  }, []);

  // FIX 1: `toSorted` returns a new, sorted copy — the caller's array is untouched.
  const sortedPlayers = players.toSorted((a, b) => b.score - a.score);

  return (
    <div ref={containerRef} className={isCompact ? 'compact' : 'full'}>
      <button onClick={() => setRound((r) => r + 1)}>Next round ({round})</button>
      <ol>
        {sortedPlayers.map((player) => (
          // FIX 2: derive the id from stable data (the name) instead of Math.random().
          <li key={player.name} data-id={player.name}>
            {player.name}: {player.score}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function App() {
  return <Leaderboard players={SAMPLE_PLAYERS} />;
}
