import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'renders far fewer than 5,000 row elements to the DOM',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const rows = screen.getAllByRole('row');
      expect(rows.length, 'rows should be windowed, not all rendered at once').to.be.lessThan(200);
    },
  },
  {
    name: 'the status summary reflects the full 5,000-row set, not just what is rendered',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByText(/5000 tasks/)).to.exist;
      expect(screen.getByText(/1667 to do/)).to.exist;
      expect(screen.getByText(/1667 in progress/)).to.exist;
      expect(screen.getByText(/1666 done/)).to.exist;
    },
  },
  {
    name: 'filtering narrows the count (via useDeferredValue, not a timer)',
    run: async ({ render, screen, user, expect, act, Component }) => {
      render(<Component />);
      const input = screen.getByLabelText('Filter by title');
      await act(async () => {
        await user.type(input, 'harness');
      });
      await waitFor(() => {
        expect(screen.getByText(/^500 tasks/)).to.exist;
      }, { timeout: 2000 });
    },
  },
  {
    name: 'shows an empty state when the filter matches nothing',
    run: async ({ render, screen, user, expect, act, Component }) => {
      render(<Component />);
      const input = screen.getByLabelText('Filter by title');
      await act(async () => {
        await user.type(input, 'this matches nothing at all');
      });
      await waitFor(() => {
        expect(screen.getByText(/No tasks match/i)).to.exist;
      }, { timeout: 2000 });
    },
  },
  {
    name: 'sorting the Status column toggles order and sets aria-sort',
    run: async ({ render, screen, user, expect, within, Component }) => {
      render(<Component />);
      const header = screen.getByRole('columnheader', { name: 'Status' });
      expect(header.getAttribute('aria-sort')).to.equal('none');
      await user.click(header);
      expect(header.getAttribute('aria-sort')).to.equal('ascending');
      const table = screen.getByRole('table', { name: 'Tasks' });
      const firstDataRow = within(table).getAllByRole('row').at(1);
      expect(firstDataRow, 'a data row should be rendered').to.exist;
      expect(firstDataRow!.textContent).to.contain('done'); // "done" sorts first alphabetically
      await user.click(header);
      expect(header.getAttribute('aria-sort')).to.equal('descending');
      const firstDataRowAfter = within(table).getAllByRole('row').at(1);
      expect(firstDataRowAfter, 'a data row should be rendered').to.exist;
      expect(firstDataRowAfter!.textContent).to.contain('todo'); // "todo" sorts first descending
    },
  },
  {
    name: 'scrolling the table changes which rows are rendered',
    run: async ({ render, screen, expect, act, within, Component }) => {
      render(<Component />);
      const table = screen.getByRole('table', { name: 'Tasks' });
      const before = within(table)
        .getAllByRole('row')
        .map((r) => r.textContent)
        .join('|');
      await act(async () => {
        table.scrollTop = 3200; // 100 rows down at ROW_HEIGHT=32
        table.dispatchEvent(new Event('scroll', { bubbles: true }));
      });
      const after = within(table)
        .getAllByRole('row')
        .map((r) => r.textContent)
        .join('|');
      expect(after, 'a different slice of rows should be rendered after scrolling').to.not.equal(before);
    },
  },
];
