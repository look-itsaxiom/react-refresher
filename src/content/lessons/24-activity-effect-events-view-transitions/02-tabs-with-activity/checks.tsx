import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'only the active tab panel is visible on first render',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const notes = screen.getByTestId('panel-notes');
      const tasks = screen.getByTestId('panel-tasks');
      expect(getComputedStyle(notes).display).to.not.equal('none');
      expect(getComputedStyle(tasks).display).to.equal('none');
    },
  },
  {
    name: 'switching tabs flips which panel is visible',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Tasks' }));
      const notes = screen.getByTestId('panel-notes');
      const tasks = screen.getByTestId('panel-tasks');
      expect(getComputedStyle(tasks).display).to.not.equal('none');
      expect(getComputedStyle(notes).display).to.equal('none');
    },
  },
  {
    name: 'a draft typed in Notes survives switching to Tasks and back',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const textarea = screen.getByLabelText('Notes draft') as HTMLTextAreaElement;
      await user.type(textarea, 'pick up dry cleaning');
      await user.click(screen.getByRole('button', { name: 'Tasks' }));
      await user.click(screen.getByRole('button', { name: 'Notes' }));
      const textareaAgain = screen.getByLabelText('Notes draft') as HTMLTextAreaElement;
      expect(textareaAgain.value).to.equal('pick up dry cleaning');
    },
  },
];
