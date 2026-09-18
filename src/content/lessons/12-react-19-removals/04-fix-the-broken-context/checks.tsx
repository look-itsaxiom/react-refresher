import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'the banner shows the theme the provider was given',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByText('Current theme: dark')).to.exist;
    },
  },
  {
    name: 'a second, independent consumer reads the same context value',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByText('Dark mode is on')).to.exist;
    },
  },
];
