import type { Check, CheckContext } from '../../../types';
import type { Task } from './data';

type CycleModule = {
  wouldCreateCycle: (tasks: Task[], from: string, to: string) => boolean;
  findCyclePath: (tasks: Task[], from: string, to: string) => string[];
};

function rowFor(screen: CheckContext['screen'], title: string): HTMLElement {
  const heading = screen.getByText(title, { selector: 'strong' });
  const li = heading.closest('li');
  if (!li) throw new Error(`Could not find a row for "${title}"`);
  return li as HTMLElement;
}

export const checks: Check[] = [
  {
    name: 'wouldCreateCycle detects direct, transitive, and self cycles',
    run: async ({ mod, expect }) => {
      const { wouldCreateCycle } = mod as unknown as CycleModule;
      const linear: Task[] = [
        { id: 'a', title: 'A', dependsOn: [] },
        { id: 'b', title: 'B', dependsOn: ['a'] },
        { id: 'c', title: 'C', dependsOn: ['b'] },
      ];
      expect(wouldCreateCycle(linear, 'a', 'b'), 'direct cycle (b already depends on a)').to.equal(true);
      expect(wouldCreateCycle(linear, 'a', 'c'), 'transitive cycle (c -> b -> a already)').to.equal(true);
      expect(wouldCreateCycle(linear, 'a', 'a'), 'a task cannot depend on itself').to.equal(true);
      expect(wouldCreateCycle(linear, 'c', 'a'), 'c depending on a is not a cycle').to.equal(false);
    },
  },
  {
    name: 'findCyclePath returns the loop from the new edge back to itself',
    run: async ({ mod, expect }) => {
      const { findCyclePath } = mod as unknown as CycleModule;
      const linear: Task[] = [
        { id: 'a', title: 'A', dependsOn: [] },
        { id: 'b', title: 'B', dependsOn: ['a'] },
        { id: 'c', title: 'C', dependsOn: ['b'] },
      ];
      const path = findCyclePath(linear, 'a', 'c');
      expect(path[0], 'path starts at "from"').to.equal('a');
      expect(path[path.length - 1], 'path ends back at "from"').to.equal('a');
      expect(path, 'path passes through the chain that closes the loop').to.include('b');
      expect(path, 'path passes through the chain that closes the loop').to.include('c');
    },
  },
  {
    name: 'adding a non-conflicting dependency updates that task\'s list',
    run: async ({ render, screen, user, expect, within, Component }) => {
      render(<Component />);
      const row = rowFor(screen, 'Design PCB');
      const select = within(row).getByLabelText('Add dependency for Design PCB');
      await user.selectOptions(select, 'Write firmware');
      expect(within(row).getByText('Write firmware')).to.exist;
    },
  },
  {
    name: 'rejects a dependency that would create a cycle, with an inline error naming the path',
    run: async ({ render, screen, user, expect, within, Component }) => {
      render(<Component />);
      const row = rowFor(screen, 'Design PCB');
      const select = within(row).getByLabelText('Add dependency for Design PCB');
      // Design PCB -> Order components would loop, since Order components already depends on Design PCB.
      await user.selectOptions(select, 'Order components');
      const alert = within(row).getByRole('alert');
      expect(alert.textContent).to.contain('Design PCB');
      expect(alert.textContent).to.contain('Order components');
      // it should not have actually been added — check for its remove button, not just any
      // text match, since the (still-available) <option> also contains the task's title.
      const removeButton = within(row).queryByLabelText('Remove dependency on Order components from Design PCB');
      expect(removeButton, 'the rejected dependency should not appear in the list').to.equal(null);
    },
  },
  {
    name: 'removing a dependency takes it off the list',
    run: async ({ render, screen, user, expect, within, Component }) => {
      render(<Component />);
      const row = rowFor(screen, 'Assemble board'); // depends on Order components
      const removeButton = within(row).getByLabelText('Remove dependency on Order components from Assemble board');
      await user.click(removeButton);
      // the <option> for "Order components" becomes available again once it's no longer a
      // dependency, so check for the (now gone) remove button rather than any text match.
      expect(
        within(row).queryByLabelText('Remove dependency on Order components from Assemble board'),
        'dependency should be gone',
      ).to.equal(null);
    },
  },
  {
    name: 'shows a Ready badge only for tasks whose dependencies are all done',
    run: async ({ render, screen, expect, within, Component }) => {
      render(<Component />);
      // Design PCB has no dependencies: ready.
      expect(within(rowFor(screen, 'Design PCB')).queryByText('Ready')).to.exist;
      // Order components depends on Design PCB, which is done: ready.
      expect(within(rowFor(screen, 'Order components')).queryByText('Ready')).to.exist;
      // Assemble board depends on Order components, which is not done: not ready.
      expect(within(rowFor(screen, 'Assemble board')).queryByText('Ready')).to.equal(null);
    },
  },
  {
    name: 'dependency controls are reachable by role and label, not by position',
    run: async ({ render, screen, expect, within, Component }) => {
      render(<Component />);
      const row = rowFor(screen, 'Flash firmware'); // depends on Assemble board and Write firmware
      expect(within(row).getByLabelText('Add dependency for Flash firmware').tagName).to.equal('SELECT');
      expect(
        within(row).getByLabelText('Remove dependency on Assemble board from Flash firmware').tagName,
      ).to.equal('BUTTON');
      expect(
        within(row).getByLabelText('Remove dependency on Write firmware from Flash firmware').tagName,
      ).to.equal('BUTTON');
    },
  },
];
