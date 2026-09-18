import type { Check } from '../../../types';

type Room = { subscriberCount: number; connectCount: number };

export const checks: Check[] = [
  {
    name: 'connects to the initial room exactly once',
    run: ({ render, mod, Component }) => {
      render(<Component />);
      const room = mod.room as Room;
      if (room.connectCount !== 1 || room.subscriberCount !== 1) {
        throw new Error(`expected 1 connection, got connectCount=${room.connectCount} subscriberCount=${room.subscriberCount}`);
      }
    },
  },
  {
    name: 'switching rooms disconnects the old connection',
    run: async ({ render, screen, user, expect, mod, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Switch room' }));
      expect(screen.getByTestId('room').textContent).to.equal('random');
      const room = mod.room as Room;
      expect(room.subscriberCount, 'the old connection should be closed').to.equal(1);
      expect(room.connectCount).to.equal(2);
    },
  },
  {
    name: 'an unrelated re-render does not reconnect',
    run: async ({ render, screen, user, expect, mod, Component }) => {
      render(<Component />);
      const bump = screen.getByRole('button', { name: /Bump/ });
      await user.click(bump);
      await user.click(bump);
      const room = mod.room as Room;
      expect(room.connectCount, 'Bump has nothing to do with roomId').to.equal(1);
      expect(room.subscriberCount).to.equal(1);
    },
  },
  {
    name: 'unmounting closes the connection',
    run: ({ render, expect, mod, Component }) => {
      const view = render(<Component />);
      view.unmount();
      const room = mod.room as Room;
      expect(room.subscriberCount).to.equal(0);
    },
  },
];
