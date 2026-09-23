import { waitFor, within } from '@testing-library/dom';
import type { Check } from '../../../types';

type Ref = { __ref: string };
type Cache = { entities: Record<string, Record<string, unknown>> };

type Mod = {
  default: React.ComponentType;
  client: { cache: Cache };
  mergeEntity: (cache: Cache, obj: Record<string, unknown>) => Ref;
  linkStats: { calls: number; byOperation: Record<string, number> };
};

export const checks: Check[] = [
  {
    name: "useTasksConnection paints the first page immediately, and fetchMore appends an ordered, deduped page while flipping hasNextPage",
    run: async ({ mod, render, screen, user, act, expect }) => {
      const { default: App } = mod as unknown as Mod;
      render(<App />);

      await waitFor(() => expect(screen.getByTestId('project-p1-t1')).to.exist);
      expect(screen.getByTestId('project-p1-t2')).to.exist;
      expect(screen.queryByTestId('project-p1-t3'), 'page 2 not loaded yet').to.equal(null);
      expect(screen.getByTestId('project-p1-load-more').textContent).to.equal('Load more');

      await act(async () => {
        await user.click(screen.getByTestId('project-p1-load-more'));
      });

      await waitFor(() => expect(screen.getByTestId('project-p1-t3')).to.exist);
      const ids = Array.from(screen.getByTestId('project-p1').querySelectorAll('li')).map((li) => li.getAttribute('data-testid'));
      expect(ids, 'page 1 items stay in place, page 2 appended in order, no duplicates').to.deep.equal([
        'project-p1-t1',
        'project-p1-t2',
        'project-p1-t3',
      ]);
      expect(screen.getByTestId('project-p1-load-more').textContent).to.equal('No more tasks');
      expect((screen.getByTestId('project-p1-load-more') as HTMLButtonElement).disabled).to.equal(true);
    },
  },
  {
    name: 'keyArgs isolation: two projects fetch and display independently, neither list mixes the other project\'s tasks',
    run: async ({ mod, render, screen, expect }) => {
      const { default: App, linkStats } = mod as unknown as Mod;
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('project-p1-t1')).to.exist;
        expect(screen.getByTestId('project-p2-u1')).to.exist;
      });
      expect(screen.queryByTestId('project-p1-u1'), 'p2 tasks never show under p1').to.equal(null);
      expect(screen.queryByTestId('project-p2-t1'), 'p1 tasks never show under p2').to.equal(null);
      expect(screen.getByTestId('project-p2-load-more').textContent, 'p2 only has one page').to.equal('No more tasks');
      expect(linkStats.byOperation['ProjectTasks'], 'each project fetched its own first page').to.equal(2);
    },
  },
  {
    name: 'deleteTask evicts the entity and gc removes it from the stored connection, so it disappears from the list',
    run: async ({ mod, render, screen, user, expect }) => {
      const { default: App, client } = mod as unknown as Mod;
      render(<App />);
      await waitFor(() => expect(screen.getByTestId('project-p1-t1')).to.exist);

      await user.click(within(screen.getByTestId('project-p1-t1')).getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(screen.queryByTestId('project-p1-t1')).to.equal(null));
      expect(screen.getByTestId('project-p1-t2'), 'unrelated row untouched').to.exist;
      expect(client.cache.entities['Task:t1'], 'entity itself evicted, not just hidden').to.equal(undefined);
    },
  },
  {
    name: "a typePolicies.keyFields of ['userId', 'orgId'] normalizes Membership by that composite key, not by a plain id",
    run: async ({ mod, expect }) => {
      const { client, mergeEntity } = mod as unknown as Mod;
      const before = Object.keys(client.cache.entities).length;

      const first = mergeEntity(client.cache, { __typename: 'Membership', userId: 'u1', orgId: 'o1', role: 'member' });
      expect(first.__ref).to.equal('Membership:u1:o1');

      const second = mergeEntity(client.cache, { __typename: 'Membership', userId: 'u1', orgId: 'o1', role: 'admin' });
      expect(second.__ref, 'same composite key both times').to.equal('Membership:u1:o1');
      expect(Object.keys(client.cache.entities).length, 'the second call merges onto the same entity, not a new one').to.equal(
        before + 1,
      );
      expect(client.cache.entities['Membership:u1:o1']).to.deep.include({ role: 'admin', userId: 'u1', orgId: 'o1' });

      const differentOrg = mergeEntity(client.cache, { __typename: 'Membership', userId: 'u1', orgId: 'o2', role: 'member' });
      expect(differentOrg.__ref, 'a different orgId is a different entity').to.equal('Membership:u1:o2');
    },
  },
];
