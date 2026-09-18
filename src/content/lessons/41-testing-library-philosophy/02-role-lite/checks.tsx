import type { Check } from '../../../types';

type RoleOptions = { name?: string | RegExp; level?: number };
type RoleLite = (container: HTMLElement, role: string, options?: RoleOptions) => HTMLElement;

function getRoleLite({ mod }: { mod: Record<string, unknown> }): RoleLite {
  const fn = mod.getByRoleLite;
  if (typeof fn !== 'function') {
    throw new Error('Expected the module to export a function named `getByRoleLite`.');
  }
  return fn as RoleLite;
}

export const checks: Check[] = [
  {
    name: 'resolves an implicit link role and its accessible name from text content',
    run: ({ render, within, expect, Component, mod }) => {
      const getByRoleLite = getRoleLite({ mod });
      const { container } = render(<Component />);
      const expected = within(container).getByRole('link', { name: 'Skip to content' });
      expect(getByRoleLite(container, 'link', { name: 'Skip to content' })).to.equal(expected);
    },
  },
  {
    name: 'disambiguates headings by level, matching the real getByRole for each',
    run: ({ render, within, expect, Component, mod }) => {
      const getByRoleLite = getRoleLite({ mod });
      const { container } = render(<Component />);
      const expectedH1 = within(container).getByRole('heading', { level: 1 });
      const expectedH2 = within(container).getByRole('heading', { level: 2 });
      expect(getByRoleLite(container, 'heading', { level: 1 })).to.equal(expectedH1);
      expect(getByRoleLite(container, 'heading', { level: 2 })).to.equal(expectedH2);
    },
  },
  {
    name: 'an explicit role="..." attribute overrides the implicit role of the tag',
    run: ({ render, within, expect, Component, mod }) => {
      const getByRoleLite = getRoleLite({ mod });
      const { container } = render(<Component />);
      const expected = within(container).getByRole('button', { name: 'Custom button' });
      expect(expected.tagName).to.equal('DIV');
      expect(getByRoleLite(container, 'button', { name: 'Custom button' })).to.equal(expected);
    },
  },
  {
    name: 'an aria-label on a real button wins as the accessible name',
    run: ({ render, within, expect, Component, mod }) => {
      const getByRoleLite = getRoleLite({ mod });
      const { container } = render(<Component />);
      const expected = within(container).getByRole('button', { name: 'Refresh list' });
      expect(getByRoleLite(container, 'button', { name: 'Refresh list' })).to.equal(expected);
    },
  },
  {
    name: 'a textbox gets its name from a `<label for>` and, separately, from a wrapping `<label>`',
    run: ({ render, within, expect, Component, mod }) => {
      const getByRoleLite = getRoleLite({ mod });
      const { container } = render(<Component />);
      const expectedEmail = within(container).getByRole('textbox', { name: 'Email' });
      const expectedSearch = within(container).getByRole('textbox', { name: 'Search' });
      expect(getByRoleLite(container, 'textbox', { name: 'Email' })).to.equal(expectedEmail);
      expect(getByRoleLite(container, 'textbox', { name: 'Search' })).to.equal(expectedSearch);
    },
  },
  {
    name: 'resolves checkbox, radio, and combobox from their input type / tag',
    run: ({ render, within, expect, Component, mod }) => {
      const getByRoleLite = getRoleLite({ mod });
      const { container } = render(<Component />);
      const expectedCheckbox = within(container).getByRole('checkbox', { name: 'Subscribe' });
      const expectedRadio = within(container).getByRole('radio', { name: 'Plan A' });
      const expectedCombobox = within(container).getByRole('combobox', { name: 'Country' });
      expect(getByRoleLite(container, 'checkbox', { name: 'Subscribe' })).to.equal(expectedCheckbox);
      expect(getByRoleLite(container, 'radio', { name: 'Plan A' })).to.equal(expectedRadio);
      expect(getByRoleLite(container, 'combobox', { name: 'Country' })).to.equal(expectedCombobox);
    },
  },
  {
    name: 'resolves list/listitem, navigation, main, and dialog landmarks',
    run: ({ render, within, expect, Component, mod }) => {
      const getByRoleLite = getRoleLite({ mod });
      const { container } = render(<Component />);
      const expectedList = within(container).getByRole('list');
      const expectedNav = within(container).getByRole('navigation', { name: 'Primary' });
      const expectedMain = within(container).getByRole('main');
      const expectedDialog = within(container).getByRole('dialog', { name: 'Confirm' });
      expect(getByRoleLite(container, 'list')).to.equal(expectedList);
      expect(getByRoleLite(container, 'navigation', { name: 'Primary' })).to.equal(expectedNav);
      expect(getByRoleLite(container, 'main')).to.equal(expectedMain);
      expect(getByRoleLite(container, 'dialog', { name: 'Confirm' })).to.equal(expectedDialog);
    },
  },
  {
    name: 'excludes elements hidden via the `hidden` attribute or `aria-hidden="true"`',
    run: ({ render, within, expect, Component, mod }) => {
      const getByRoleLite = getRoleLite({ mod });
      const { container } = render(<Component />);
      expect(within(container).queryByRole('button', { name: 'Archived' })).to.equal(null);
      expect(within(container).queryByRole('button', { name: 'Ghost' })).to.equal(null);
      expect(() => getByRoleLite(container, 'button', { name: 'Archived' })).to.throw();
      expect(() => getByRoleLite(container, 'button', { name: 'Ghost' })).to.throw();
    },
  },
  {
    name: 'throws a helpful error on zero matches and on multiple matches',
    run: ({ render, expect, Component, mod }) => {
      const getByRoleLite = getRoleLite({ mod });
      const { container } = render(<Component />);
      expect(() => getByRoleLite(container, 'tab')).to.throw(/found no elements/i);
      // Three <li> elements share the `listitem` role with no name filter given.
      expect(() => getByRoleLite(container, 'listitem')).to.throw(/found 3 elements/i);
    },
  },
];
