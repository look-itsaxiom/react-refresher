import type { ComponentType } from 'react';
import type { Check } from '../../../types';

type Player = { name: string; score: number };

const PLAYERS: Player[] = [
  { name: 'Amara', score: 12 },
  { name: 'Bo', score: 30 },
  { name: 'Chidi', score: 21 },
];

function freshPlayers(): Player[] {
  return PLAYERS.map((p) => ({ ...p }));
}

function getLeaderboard(mod: Record<string, unknown>) {
  return mod.Leaderboard as ComponentType<{ players: Player[] }>;
}

export const checks: Check[] = [
  {
    name: 'renders without crashing on the first render',
    run: async ({ render, mod }) => {
      const Leaderboard = getLeaderboard(mod);
      render(<Leaderboard players={freshPlayers()} />);
    },
  },
  {
    name: 'renders players sorted by score, highest first',
    run: async ({ render, screen, expect, mod }) => {
      const Leaderboard = getLeaderboard(mod);
      render(<Leaderboard players={freshPlayers()} />);
      const items = screen.getAllByRole('listitem').map((li) => li.textContent);
      const order = items.map((t) => t?.split(':')[0]?.trim() ?? '');
      expect(order).to.deep.equal(['Bo', 'Chidi', 'Amara']);
    },
  },
  {
    name: 'does not mutate the players array passed in as a prop',
    run: async ({ render, expect, mod }) => {
      const Leaderboard = getLeaderboard(mod);
      const players = freshPlayers();
      const namesBefore = players.map((p) => p.name);
      render(<Leaderboard players={players} />);
      const namesAfter = players.map((p) => p.name);
      expect(namesAfter).to.deep.equal(namesBefore);
    },
  },
  {
    name: 'row ids stay stable across a re-render',
    run: async ({ render, screen, user, expect, mod }) => {
      const Leaderboard = getLeaderboard(mod);
      render(<Leaderboard players={freshPlayers()} />);
      const idsBefore = screen.getAllByRole('listitem').map((li) => li.getAttribute('data-id'));
      await user.click(screen.getByRole('button', { name: /next round/i }));
      const idsAfter = screen.getAllByRole('listitem').map((li) => li.getAttribute('data-id'));
      expect(idsAfter).to.deep.equal(idsBefore);
    },
  },
];
