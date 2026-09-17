import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { Markdown } from './Markdown';

// React's documented escape hatch for custom test runners exposes no typed global, hence `any`.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// This project does not enable vitest's `globals`, so RTL's auto-cleanup (which hooks the
// global `afterEach`) never registers. Any test file with more than one `render()` needs this.
afterEach(cleanup);

// `Markdown` suspends on the shared, module-level highlighter promise (via React's `use()`).
// RTL's `render()` wraps its initial mount in its own synchronous, un-awaited `act()`, which
// exits before that promise settles; a later separate `await waitFor(...)`/`findBy*` call never
// observes the retry in this React 19 + RTL 16 + jsdom combination. Wrapping the initial render
// in our own awaited async `act()` keeps the whole suspend -> resolve -> retry cycle inside one
// flush loop, which reliably re-renders once the highlighter is ready.
async function renderMarkdown(source: string) {
  await act(async () => {
    render(<Markdown source={source} />);
  });
}

describe('Markdown', () => {
  it('renders a fenced code block with shiki highlighting for a known language', async () => {
    await renderMarkdown('# Title\n\n```tsx\nconst a = 1;\n```\n\nsome text');
    await screen.findByText('some text', undefined, { timeout: 5000 });
    expect(document.querySelector('pre.shiki')).not.toBeNull();
  });

  it('renders a fenced code block in an unregistered language as plain text without throwing', async () => {
    await renderMarkdown('```rust\nfn main() {}\n```\n\nafter');
    await screen.findByText('after', undefined, { timeout: 5000 });
    expect(screen.getByText(/fn main/)).toBeTruthy();
  });
});
