import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { RouteError } from './RouteError';

function Boom(): never {
  throw new Error('kaboom');
}

describe('RouteError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a message and a way back to the dashboard when a route throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const router = createMemoryRouter([
      {
        path: '/',
        errorElement: <RouteError />,
        children: [{ index: true, Component: Boom }],
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('kaboom')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Back to dashboard' });
    expect(link.getAttribute('href')).toBe('/');
  });
});
