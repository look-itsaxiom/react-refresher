import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

type Cache = {
  entities: Record<string, Record<string, unknown>>;
  entityIds: Record<string, string[]>;
  entityRefs: Record<string, string>;
  listeners: Set<(changedKeys: string[]) => void>;
};

type Mod = {
  TaskList: React.ComponentType<{ fetchPolicy?: 'cache-first' | 'network-only' | 'cache-and-network' }>;
  TaskRow: React.ComponentType<{ id: string; testId: string }>;
  AddTask: React.ComponentType;
  linkStats: { calls: number; byOperation: Record<string, number> };
  failNextRequest: (message?: string) => void;
  client: { cache: Cache };
  modify: (cache: Cache, id: string, fields: Record<string, unknown>) => void;
};

export const checks: Check[] = [
  {
    name: "fetchPolicy 'cache-first': two components mounted at once for the same query share one network request",
    run: async ({ mod, render, screen, expect }) => {
      const { TaskList, linkStats } = mod as unknown as Mod;
      render(
        <div>
          <TaskList fetchPolicy="cache-first" />
          <TaskList fetchPolicy="cache-first" />
        </div>,
      );
      await waitFor(() => expect(screen.getAllByTestId('task-1')).to.have.lengthOf(2));
      expect(linkStats.byOperation['ListTasks'] ?? 0, 'exactly one network request for two cache-first mounts').to.equal(1);
    },
  },
  {
    name: "fetchPolicy 'network-only': two mounted components each issue their own network request",
    run: async ({ mod, render, screen, expect }) => {
      const { TaskList, linkStats } = mod as unknown as Mod;
      render(
        <div>
          <TaskList fetchPolicy="network-only" />
          <TaskList fetchPolicy="network-only" />
        </div>,
      );
      await waitFor(() => expect(screen.getAllByTestId('task-1')).to.have.lengthOf(2));
      expect(linkStats.byOperation['ListTasks'] ?? 0, 'network-only never dedupes').to.equal(2);
    },
  },
  {
    name: "fetchPolicy 'cache-and-network' paints cached data on the very first render, then still issues a background request",
    run: async ({ mod, render, screen, expect }) => {
      const { TaskList, linkStats } = mod as unknown as Mod;
      const first = render(<TaskList fetchPolicy="cache-first" />);
      await waitFor(() => expect(screen.getByTestId('task-1')).to.exist);
      first.unmount();
      expect(linkStats.byOperation['ListTasks']).to.equal(1);

      render(<TaskList fetchPolicy="cache-and-network" />);
      // No waitFor: the cached value must already be on screen from the synchronous
      // initial render, before the background request has any chance to resolve.
      expect(screen.getByTestId('task-1'), 'cached data shown synchronously, no loading flash').to.exist;
      expect(screen.getByTestId('task-2')).to.exist;

      await waitFor(() => expect(linkStats.byOperation['ListTasks']).to.equal(2));
    },
  },
  {
    name: 'a mutation with optimisticResponse shows the new item immediately, then reconciles the temp id with the real one',
    run: async ({ mod, render, screen, user, expect }) => {
      const { TaskList, AddTask } = mod as unknown as Mod;
      render(
        <div>
          <TaskList fetchPolicy="cache-first" />
          <AddTask />
        </div>,
      );
      await waitFor(() => expect(screen.getByTestId('task-2')).to.exist);

      await user.click(screen.getByRole('button', { name: 'Add task' }));
      // Right after the click resolves, the optimistic write should already have landed —
      // before the fake link's network delay has had a chance to settle.
      expect(screen.getByTestId('task-temp-id'), 'optimistic item visible before the network resolves').to.exist;

      await waitFor(() => {
        expect(screen.queryByTestId('task-temp-id'), 'temp id replaced once the real response lands').to.equal(null);
        expect(screen.getByTestId('task-3')).to.exist;
      });
    },
  },
  {
    name: 'a failed mutation rolls back the optimistic write and surfaces the error',
    run: async ({ mod, render, screen, user, expect }) => {
      const { TaskList, AddTask, failNextRequest } = mod as unknown as Mod;
      render(
        <div>
          <TaskList fetchPolicy="cache-first" />
          <AddTask />
        </div>,
      );
      await waitFor(() => expect(screen.getByTestId('task-2')).to.exist);

      failNextRequest('boom');
      await user.click(screen.getByRole('button', { name: 'Add task' }));

      await waitFor(() => {
        expect(screen.getByTestId('add-task-error').textContent).to.equal('boom');
        expect(screen.queryByTestId('task-temp-id'), 'optimistic item rolled back').to.equal(null);
      });
      expect(screen.getAllByTestId(/^task-\d+$/).length, 'list back to its original two items').to.equal(2);
    },
  },
  {
    name: 'cache.modify on one entity re-renders only the component reading that entity',
    run: async ({ mod, render, screen, expect }) => {
      const { TaskRow, client, modify } = mod as unknown as Mod;
      render(
        <div>
          <TaskRow id="1" testId="row-1" />
          <TaskRow id="2" testId="row-2" />
        </div>,
      );
      await waitFor(() => {
        expect(screen.getByTestId('row-1').textContent).to.equal('Write docs');
        expect(screen.getByTestId('row-2').textContent).to.equal('Ship it');
      });
      const rendersBefore1 = Number(screen.getByTestId('row-1').getAttribute('data-renders'));
      const rendersBefore2 = Number(screen.getByTestId('row-2').getAttribute('data-renders'));

      modify(client.cache, 'Task:1', { title: 'Updated title' });

      await waitFor(() => expect(screen.getByTestId('row-1').textContent).to.equal('Updated title'));
      expect(Number(screen.getByTestId('row-1').getAttribute('data-renders'))).to.be.greaterThan(rendersBefore1);
      expect(
        Number(screen.getByTestId('row-2').getAttribute('data-renders')),
        'row reading a different entity does not re-render',
      ).to.equal(rendersBefore2);
      expect(screen.getByTestId('row-2').textContent, 'unrelated entity unchanged').to.equal('Ship it');
    },
  },
];
