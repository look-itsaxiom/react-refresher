import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'no on* attribute survives anywhere in the rendered tree',
    run: async ({ render, Component, expect }) => {
      const { container } = render(<Component />);
      const names: string[] = [];
      container.querySelectorAll('*').forEach((el) => {
        for (const attr of Array.from(el.attributes)) names.push(attr.name.toLowerCase());
      });
      expect(names.some((n) => n.startsWith('on')), `found attributes: ${names.join(', ')}`).to.equal(false);
    },
  },
  {
    name: 'no style attribute survives from the spread meta object',
    run: async ({ render, Component, expect }) => {
      const { container } = render(<Component />);
      const withStyle = container.querySelectorAll('[style]');
      expect(withStyle.length, 'the spread `meta` object (including a `style` value) must not land on any element').to.equal(0);
    },
  },
  {
    name: 'no script tag and no javascript: URL anywhere in the markup',
    run: async ({ render, Component, expect }) => {
      const { container } = render(<Component />);
      expect(container.querySelector('script'), 'no script element should be present').to.equal(null);
      const links = Array.from(container.querySelectorAll('a'));
      for (const link of links) {
        const href = link.getAttribute('href') ?? '';
        expect(href.toLowerCase(), `link href "${href}" must not use a javascript: scheme`).to.not.include('javascript:');
      }
    },
  },
  {
    name: "the unsafe comment's img has no onerror and its safe <p>nice</p> still renders",
    run: async ({ render, Component, expect }) => {
      const { container } = render(<Component />);
      expect(container.innerHTML.toLowerCase(), 'no onerror handler should survive').to.not.include('onerror');
      expect(container.textContent).to.include('nice');
    },
  },
  {
    name: "the unsafe comment's author renders without a javascript: link (plain text or href-less)",
    run: async ({ render, Component, expect }) => {
      const { container } = render(<Component />);
      expect(container.textContent).to.include('anon');
      const anonLink = Array.from(container.querySelectorAll('a')).find((a) => a.textContent === 'anon');
      if (anonLink) {
        expect(anonLink.getAttribute('href') ?? '', 'if rendered as a link, it must not carry the javascript: URL').to.not.include('javascript:');
      }
    },
  },
  {
    name: 'the benign comment keeps its formatting, text, and a real profile link',
    run: async ({ render, Component, expect }) => {
      const { container } = render(<Component />);
      expect(container.textContent).to.include('Great post!');
      const bold = Array.from(container.querySelectorAll('b')).find((b) => b.textContent === 'this');
      expect(bold, 'the <b>this</b> emphasis from the sanitized rich text should survive').to.not.equal(undefined);
      const priyaLink = Array.from(container.querySelectorAll('a')).find((a) => a.textContent === 'Priya');
      expect(priyaLink?.getAttribute('href')).to.equal('https://example.com/priya');
    },
  },
];
