import { useRef, useState } from 'react';

export type Player = { name: string; score: number };

const SAMPLE_PLAYERS: Player[] = [
  { name: 'Amara', score: 12 },
  { name: 'Bo', score: 30 },
  { name: 'Chidi', score: 21 },
];

export function Leaderboard({ players }: { players: Player[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [round, setRound] = useState(1);

  // BUG 1: mutates the `players` prop in place instead of copying it.
  players.sort((a, b) => b.score - a.score);

  // BUG 3: reads a ref during render — `containerRef.current` is still null
  // on the very first render, so this throws before anything ever shows up.
  const isCompact = containerRef.current!.offsetWidth < 480;

  return (
    <div ref={containerRef} className={isCompact ? 'compact' : 'full'}>
      <button onClick={() => setRound((r) => r + 1)}>Next round ({round})</button>
      <ol>
        {players.map((player) => {
          // BUG 2: a fresh random id every render, even though the row didn't move.
          const id = Math.random().toString(36).slice(2);
          return (
            <li key={player.name} data-id={id}>
              {player.name}: {player.score}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function App() {
  return <Leaderboard players={SAMPLE_PLAYERS} />;
}
