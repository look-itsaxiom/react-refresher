import { Profiler } from 'react';
import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'the filter input shows what you type',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const input = screen.getByRole('textbox', { name: /filter rows/i });
      await user.type(input, 'wid');
      expect((input as HTMLInputElement).value).to.equal('wid');
    },
  },
  {
    name: 'Chart never re-renders while typing in the filter',
    run: async ({ render, screen, user, expect, Component }) => {
      let commits = 0;
      render(
        <Profiler id="root" onRender={() => { commits += 1; }}>
          <Component />
        </Profiler>,
      );
      const input = screen.getByRole('textbox', { name: /filter rows/i });
      await user.type(input, 't 5');

      await waitFor(() => {
        expect(commits, 'expected at least one commit while typing').to.be.greaterThan(0);
      });

      const chart = screen.getByTestId('chart');
      expect(chart.getAttribute('data-renders'), "Chart's render count").to.equal('1');
    },
  },
  {
    name: "Table re-renders far less than once per keystroke",
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const input = screen.getByRole('textbox', { name: /filter rows/i });
      await user.type(input, 't 5');

      await waitFor(() => {
        const rows = screen.getAllByRole('listitem');
        expect(rows.length, 'expected filtering down to "Widget 5" only').to.equal(1);
        expect(rows[0]?.textContent).to.equal('Widget 5');
      });

      const table = screen.getByTestId('table');
      const renders = Number(table.getAttribute('data-renders'));
      expect(renders, "Table's render count").to.be.greaterThan(0);
      expect(renders, "Table's render count").to.be.at.most(4);
    },
  },
];
