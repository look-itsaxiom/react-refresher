import type { ComponentType, ReactNode } from 'react';
import type { Check } from '../../../types';

type TabsNamespace = {
  Root: ComponentType<any>;
  List: ComponentType<any>;
  Trigger: ComponentType<any>;
  Content: ComponentType<any>;
};

function getTabs(mod: Record<string, unknown>): TabsNamespace {
  return (mod as { Tabs: TabsNamespace }).Tabs;
}

function Demo({ Tabs, ...rootProps }: { Tabs: TabsNamespace } & Record<string, unknown>) {
  return (
    <Tabs.Root {...rootProps}>
      <Tabs.List aria-label="Demo">
        <Tabs.Trigger value="a">A</Tabs.Trigger>
        <Tabs.Trigger value="b">B</Tabs.Trigger>
        <Tabs.Trigger value="c">C</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="a">Panel A</Tabs.Content>
      <Tabs.Content value="b">Panel B</Tabs.Content>
      <Tabs.Content value="c">Panel C</Tabs.Content>
    </Tabs.Root>
  );
}

export const checks: Check[] = [
  {
    name: 'renders tablist/tab/tabpanel roles with ARIA wiring, and only the active panel is in the DOM',
    run: async ({ mod, render, screen, expect }) => {
      const Tabs = getTabs(mod);
      render(<Demo Tabs={Tabs} defaultValue="a" />);

      expect(screen.getByRole('tablist', { name: 'Demo' })).to.not.equal(null);
      const tabA = screen.getByRole('tab', { name: 'A' });
      const tabB = screen.getByRole('tab', { name: 'B' });
      expect(tabA.getAttribute('aria-selected')).to.equal('true');
      expect(tabB.getAttribute('aria-selected')).to.equal('false');

      const panel = screen.getByRole('tabpanel');
      expect(panel.textContent).to.equal('Panel A');
      expect(panel.getAttribute('aria-labelledby')).to.equal(tabA.id);
      expect(tabA.getAttribute('aria-controls')).to.equal(panel.id);
      expect(screen.queryByText('Panel B')).to.equal(null);
    },
  },
  {
    name: 'uncontrolled: clicking a trigger switches the active tab and panel without a value prop',
    run: async ({ mod, render, screen, user, expect }) => {
      const Tabs = getTabs(mod);
      render(<Demo Tabs={Tabs} defaultValue="a" />);

      await user.click(screen.getByRole('tab', { name: 'B' }));

      expect(screen.getByRole('tab', { name: 'B' }).getAttribute('aria-selected')).to.equal('true');
      expect(screen.getByRole('tabpanel').textContent).to.equal('Panel B');
    },
  },
  {
    name: 'controlled: the value prop drives the active tab, and onValueChange fires without the component changing itself',
    run: async ({ mod, render, screen, user, expect }) => {
      const Tabs = getTabs(mod);
      const changes: string[] = [];

      render(<Demo Tabs={Tabs} value="a" onValueChange={(next: string) => changes.push(next)} />);
      await user.click(screen.getByRole('tab', { name: 'B' }));

      expect(changes).to.deep.equal(['b']);
      expect(screen.getByRole('tabpanel').textContent, 'the parent never applied the change, so panel A should still show').to.equal(
        'Panel A',
      );
      expect(screen.getByRole('tab', { name: 'A' }).getAttribute('aria-selected')).to.equal('true');
    },
  },
  {
    name: 'ArrowRight/ArrowLeft move and activate focus with wraparound; Home/End jump to the ends',
    run: async ({ mod, render, screen, user, expect }) => {
      const Tabs = getTabs(mod);
      render(<Demo Tabs={Tabs} defaultValue="a" />);

      const a = screen.getByRole('tab', { name: 'A' });
      const b = screen.getByRole('tab', { name: 'B' });
      const c = screen.getByRole('tab', { name: 'C' });
      a.focus();

      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).to.equal(b);
      expect(b.getAttribute('aria-selected')).to.equal('true');

      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).to.equal(c);
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement, 'ArrowRight from the last tab should wrap to the first').to.equal(a);
      expect(a.getAttribute('aria-selected')).to.equal('true');

      await user.keyboard('{End}');
      expect(document.activeElement).to.equal(c);
      await user.keyboard('{Home}');
      expect(document.activeElement).to.equal(a);
    },
  },
  {
    name: 'data-state reflects active/inactive, and only the active trigger is tab-reachable (roving tabIndex)',
    run: async ({ mod, render, screen, expect }) => {
      const Tabs = getTabs(mod);
      render(<Demo Tabs={Tabs} defaultValue="a" />);

      const a = screen.getByRole('tab', { name: 'A' });
      const b = screen.getByRole('tab', { name: 'B' });
      expect(a.getAttribute('data-state')).to.equal('active');
      expect(b.getAttribute('data-state')).to.equal('inactive');
      expect(a.tabIndex).to.equal(0);
      expect(b.tabIndex).to.equal(-1);
    },
  },
  {
    name: 'asChild renders the given child as the tab element, merging its className and keeping activation working',
    run: async ({ mod, render, screen, user, expect }) => {
      const Tabs = getTabs(mod);
      render(
        <Tabs.Root defaultValue="a">
          <Tabs.List aria-label="Demo">
            <Tabs.Trigger value="a" asChild>
              <a href="#a" className="link">
                A
              </a>
            </Tabs.Trigger>
            <Tabs.Trigger value="b">B</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Panel A</Tabs.Content>
          <Tabs.Content value="b">Panel B</Tabs.Content>
        </Tabs.Root>,
      );

      const tabA = screen.getByRole('tab', { name: 'A' });
      expect(tabA.tagName).to.equal('A');
      expect(tabA.getAttribute('href')).to.equal('#a');
      expect(tabA.className.split(/\s+/)).to.include('link');

      await user.click(screen.getByRole('tab', { name: 'B' }));
      expect(screen.getByRole('tabpanel').textContent).to.equal('Panel B');
      await user.click(tabA);
      expect(tabA.getAttribute('aria-selected')).to.equal('true');
      expect(screen.getByRole('tabpanel').textContent).to.equal('Panel A');
    },
  },
  {
    name: 'Slot merges props onto its child: plain props (child wins), className (joined), style (merged), handlers (child first, then slot), and refs (both point at the same node)',
    run: async ({ mod, render, screen, user, expect }) => {
      const { Slot } = mod as { Slot: ComponentType<Record<string, unknown> & { children: ReactNode }> };
      const order: string[] = [];
      let outerNode: HTMLButtonElement | null = null;
      let innerNode: HTMLButtonElement | null = null;

      render(
        <Slot
          ref={(node: HTMLButtonElement | null) => {
            outerNode = node;
          }}
          className="slot-class"
          style={{ color: 'red', fontWeight: 'normal' }}
          aria-hidden="true"
          data-testid="btn"
          onClick={() => order.push('slot')}
        >
          <button
            ref={(node: HTMLButtonElement | null) => {
              innerNode = node;
            }}
            className="child-class"
            style={{ fontWeight: 'bold' }}
            aria-hidden="false"
            onClick={() => order.push('child')}
          >
            Click me
          </button>
        </Slot>,
      );

      const button = screen.getByTestId('btn');
      expect(button.tagName).to.equal('BUTTON');
      const classes = button.className.split(/\s+/);
      expect(classes).to.include('slot-class');
      expect(classes).to.include('child-class');
      expect(button.style.color).to.equal('red');
      expect(button.style.fontWeight, 'the child style should win on a conflicting key').to.equal('bold');
      expect(button.getAttribute('aria-hidden'), 'a plain prop the child also set should use the child value').to.equal('false');
      expect(outerNode).to.equal(button);
      expect(innerNode).to.equal(button);

      await user.click(button);
      expect(order, 'the child handler should fire before the slot handler').to.deep.equal(['child', 'slot']);
    },
  },
];
