import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'each field is reachable by its own label text with the right value',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const first = screen.getByLabelText('First name') as HTMLInputElement;
      const last = screen.getByLabelText('Last name') as HTMLInputElement;
      expect(first.value).to.equal('Ada');
      expect(last.value).to.equal('Lovelace');
      expect(first).to.not.equal(last);
    },
  },
  {
    name: 'every input and hint id on the page is unique',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const inputs = screen.getAllByRole('textbox');
      const ids = inputs.map((el) => el.id);
      expect(ids.every((id) => id.length > 0), 'every input has an id').to.equal(true);
      expect(new Set(ids).size, 'input ids are unique').to.equal(ids.length);
    },
  },
  {
    name: 'aria-describedby on each input points to its own hint paragraph',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const first = screen.getByLabelText('First name');
      const last = screen.getByLabelText('Last name');
      const firstHintId = first.getAttribute('aria-describedby');
      const lastHintId = last.getAttribute('aria-describedby');
      expect(firstHintId, 'first field has aria-describedby').to.not.equal(null);
      expect(lastHintId, 'last field has aria-describedby').to.not.equal(null);
      expect(firstHintId).to.not.equal(lastHintId);
      const firstHint = document.getElementById(firstHintId!);
      const lastHint = document.getElementById(lastHintId!);
      expect(firstHint?.textContent).to.equal('As it appears on your ID.');
      expect(lastHint?.textContent).to.equal('As it appears on your ID.');
      expect(firstHint).to.not.equal(lastHint);
    },
  },
];
