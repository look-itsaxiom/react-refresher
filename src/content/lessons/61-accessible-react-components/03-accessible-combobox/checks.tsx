import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'the input has role="combobox" and starts collapsed, with no listbox present',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const combobox = screen.getByRole('combobox');
      expect(combobox.getAttribute('aria-expanded')).to.equal('false');
      expect(screen.queryByRole('listbox')).to.equal(null);
    },
  },
  {
    name: 'typing expands the combobox and shows only matching options',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.type(screen.getByRole('combobox'), 'a');

      expect(screen.getByRole('combobox').getAttribute('aria-expanded')).to.equal('true');
      const options = screen.getAllByRole('option');
      expect(options.length).to.be.greaterThan(0);
      for (const option of options) {
        expect(option.textContent?.toLowerCase()).to.include('a');
      }
    },
  },
  {
    name: 'ArrowDown activates the first option via aria-activedescendant without moving real focus off the input',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const combobox = screen.getByRole('combobox');
      await user.type(combobox, 'a');
      await user.keyboard('{ArrowDown}');

      const options = screen.getAllByRole('option');
      const activeId = combobox.getAttribute('aria-activedescendant');
      expect(activeId, 'aria-activedescendant should be set after ArrowDown').to.be.a('string');
      expect(options[0]!.id).to.equal(activeId);
      expect(options[0]!.getAttribute('aria-selected')).to.equal('true');
      expect(document.activeElement, 'real focus must stay on the input').to.equal(combobox);
    },
  },
  {
    name: 'a second ArrowDown moves the active option forward',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const combobox = screen.getByRole('combobox');
      await user.type(combobox, 'a');
      await user.keyboard('{ArrowDown}{ArrowDown}');

      const options = screen.getAllByRole('option');
      expect(combobox.getAttribute('aria-activedescendant')).to.equal(options[1]!.id);
      expect(options[1]!.getAttribute('aria-selected')).to.equal('true');
      expect(options[0]!.getAttribute('aria-selected')).to.not.equal('true');
    },
  },
  {
    name: 'Enter commits the active option: fills the input and collapses the popup',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const combobox = screen.getByRole('combobox') as HTMLInputElement;
      await user.type(combobox, 'a');
      await user.keyboard('{ArrowDown}');
      const firstOptionText = screen.getAllByRole('option')[0]!.textContent;

      await user.keyboard('{Enter}');

      expect(combobox.value).to.equal(firstOptionText);
      expect(combobox.getAttribute('aria-expanded')).to.equal('false');
      expect(screen.queryByRole('listbox')).to.equal(null);
    },
  },
  {
    name: 'Escape collapses the popup without changing the input value',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const combobox = screen.getByRole('combobox') as HTMLInputElement;
      await user.type(combobox, 'a');
      await user.keyboard('{Escape}');

      expect(combobox.getAttribute('aria-expanded')).to.equal('false');
      expect(screen.queryByRole('listbox')).to.equal(null);
      expect(combobox.value).to.equal('a');
    },
  },
  {
    name: 'clicking an option commits it the same way Enter would',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const combobox = screen.getByRole('combobox') as HTMLInputElement;
      await user.type(combobox, 'a');
      const firstOption = screen.getAllByRole('option')[0]!;
      const text = firstOption.textContent;

      await user.click(firstOption);

      expect(combobox.value).to.equal(text);
      expect(screen.queryByRole('listbox')).to.equal(null);
    },
  },
  {
    name: 'a role="status" region reports the result count while open and is empty while closed',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const status = screen.getByRole('status');
      expect(status.textContent?.trim()).to.equal('');

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, 'a');
      const count = screen.getAllByRole('option').length;
      expect(screen.getByRole('status').textContent).to.match(new RegExp(`${count} results?`));

      await user.keyboard('{Escape}');
      expect(screen.getByRole('status').textContent?.trim()).to.equal('');
    },
  },
];
