import type { Check } from '../../../types';

type Step =
  | { kind: 'role'; role: string; name?: string }
  | { kind: 'text'; text: string; exact?: boolean }
  | { kind: 'testId'; id: string }
  | { kind: 'filter'; hasText: string }
  | { kind: 'nth'; index: number }
  | { kind: 'locator'; css: string };
type Chain = Step[];
type Mod = {
  roleOf: (el: Element) => string | null;
  locate: (root: Element, chain: Chain) => Element[];
  strictOne: (chain: Chain, root: Element) => Element;
};

export const checks: Check[] = [
  {
    name: 'a `role` step with a `name` finds exactly one heading',
    run: ({ mod, render, expect, Component }) => {
      const { locate } = mod as unknown as Mod;
      const { container } = render(<Component />);
      const matches = locate(container, [{ kind: 'role', role: 'heading', name: 'Checkout' }]);
      expect(matches.length).to.equal(1);
      expect(matches[0]!.textContent).to.equal('Checkout');
    },
  },
  {
    name: 'a bare `role` step with no `name` can resolve to more than one element, and strictOne rejects that',
    run: ({ mod, render, expect, Component }) => {
      const { locate, strictOne } = mod as unknown as Mod;
      const { container } = render(<Component />);
      const matches = locate(container, [{ kind: 'role', role: 'button' }]);
      expect(matches.length).to.equal(3);
      expect(() => strictOne([{ kind: 'role', role: 'button' }], container)).to.throw(/resolved to 3 elements/);
    },
  },
  {
    name: 'a `text` step returns the innermost matching element, not an ancestor that also contains the text',
    run: ({ mod, render, expect, Component }) => {
      const { locate } = mod as unknown as Mod;
      const { container } = render(<Component />);
      const matches = locate(container, [{ kind: 'text', text: 'Trail mix' }]);
      expect(matches.length).to.equal(1);
      expect(matches[0]!.tagName.toLowerCase()).to.equal('span');
      expect(matches[0]!.textContent).to.equal('Trail mix');
    },
  },
  {
    name: 'chaining `testId` then `role` scopes the second step to descendants of the first match',
    run: ({ mod, render, expect, Component }) => {
      const { locate, strictOne } = mod as unknown as Mod;
      const { container } = render(<Component />);
      const chain: Chain = [{ kind: 'testId', id: 'row-1' }, { kind: 'role', role: 'button' }];
      const button = strictOne(chain, container);
      expect(button.tagName.toLowerCase()).to.equal('button');
      expect(button.textContent).to.equal('Remove');
      expect(button.closest('[data-testid="row-1"]')).to.exist;
    },
  },
  {
    name: '`locator` then `filter` narrows a CSS match down by its own text content',
    run: ({ mod, render, expect, Component }) => {
      const { locate } = mod as unknown as Mod;
      const { container } = render(<Component />);
      const matches = locate(container, [{ kind: 'locator', css: 'li' }, { kind: 'filter', hasText: 'Water' }]);
      expect(matches.length).to.equal(1);
      expect(matches[0]!.getAttribute('data-testid')).to.equal('row-2');
    },
  },
  {
    name: '`nth` picks by position in document order, matching what a scoped chain finds independently',
    run: ({ mod, render, expect, Component }) => {
      const { locate } = mod as unknown as Mod;
      const { container } = render(<Component />);
      const firstButton = locate(container, [{ kind: 'role', role: 'button' }, { kind: 'nth', index: 0 }]);
      const row1Button = locate(container, [{ kind: 'testId', id: 'row-1' }, { kind: 'role', role: 'button' }]);
      expect(firstButton.length).to.equal(1);
      expect(firstButton[0]).to.equal(row1Button[0]);
    },
  },
  {
    name: 'roleOf recognizes a checkbox with an aria-label, and a link with no href has no role',
    run: ({ mod, render, expect, Component }) => {
      const { locate, roleOf } = mod as unknown as Mod;
      const { container } = render(<Component />);
      const checkbox = locate(container, [{ kind: 'role', role: 'checkbox', name: 'Gift wrap' }]);
      expect(checkbox.length).to.equal(1);
      const bareAnchor = document.createElement('a');
      bareAnchor.textContent = 'no href here';
      expect(roleOf(bareAnchor)).to.equal(null);
    },
  },
  {
    name: 'strictOne throws a strict-mode error for zero matches too, and locate never caches stale results',
    run: async ({ mod, render, expect, user, Component }) => {
      const { locate, strictOne } = mod as unknown as Mod;
      const { container } = render(<Component />);

      expect(() => strictOne([{ kind: 'role', role: 'link', name: 'Nowhere' }], container)).to.throw(
        /resolved to 0 elements/,
      );

      const removeRow1 = strictOne(
        [{ kind: 'testId', id: 'row-1' }, { kind: 'role', role: 'button' }],
        container,
      );
      await user.click(removeRow1);

      const stillThere = locate(container, [{ kind: 'testId', id: 'row-1' }]);
      expect(stillThere.length, 'locate must re-read the DOM, not reuse an earlier snapshot').to.equal(0);
    },
  },
];
