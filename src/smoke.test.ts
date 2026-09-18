import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';

describe('toolchain smoke', () => {
  it('renders React into jsdom', () => {
    render(createElement('p', null, 'hello'));
    expect(screen.getByText('hello')).toBeTruthy();
  });
});
