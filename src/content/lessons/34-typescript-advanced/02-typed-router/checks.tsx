import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'matches a single dynamic segment and captures its param',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByTestId('result').textContent).to.match(/^\/users\/:id params=/);
      expect(screen.getByTestId('result').textContent).to.include('"id":"42"');
    },
  },
  {
    name: 'matches a nested route with two params',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const input = screen.getByLabelText('URL');
      await user.clear(input);
      await user.type(input, '/users/7/posts/99');
      const text = screen.getByTestId('result').textContent ?? '';
      expect(text).to.match(/^\/users\/:id\/posts\/:postId params=/);
      expect(text).to.include('"id":"7"');
      expect(text).to.include('"postId":"99"');
    },
  },
  {
    name: 'reports no match for a path that matches no route',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const input = screen.getByLabelText('URL');
      await user.clear(input);
      await user.type(input, '/nope');
      expect(screen.getByTestId('result').textContent).to.equal('no match');
    },
  },
  {
    name: 'does not match a route when segment counts differ',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const input = screen.getByLabelText('URL');
      await user.clear(input);
      await user.type(input, '/users');
      expect(screen.getByTestId('result').textContent).to.equal('no match');
    },
  },
  {
    name: 'treats a literal segment as literal, not as a wildcard',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const input = screen.getByLabelText('URL');
      await user.clear(input);
      await user.type(input, '/admins/42');
      expect(screen.getByTestId('result').textContent).to.equal('no match');
    },
  },
];
