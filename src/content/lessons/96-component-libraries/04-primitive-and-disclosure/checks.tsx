import type { ComponentType, ReactNode } from 'react';
import type { Check } from '../../../types';

type DisclosureNamespace = {
  Root: ComponentType<any>;
  Trigger: ComponentType<any>;
  Content: ComponentType<any>;
};

function getDisclosure(mod: Record<string, unknown>): DisclosureNamespace {
  return (mod as { Disclosure: DisclosureNamespace }).Disclosure;
}

export const checks: Check[] = [
  {
    name: 'mergeProps composes handlers in argument order, joins className, shallow-merges style, and skips undefined so it never clobbers an earlier value',
    run: async ({ mod, expect }) => {
      const { mergeProps } = mod as { mergeProps: (...args: Array<Record<string, unknown> | undefined>) => Record<string, unknown> };
      const order: string[] = [];

      const merged = mergeProps(
        {
          className: 'base',
          style: { color: 'red', fontWeight: 'normal' },
          disabled: true,
          onClick: () => order.push('first'),
        },
        {
          className: 'extra',
          style: { fontWeight: 'bold' },
          disabled: undefined,
          onClick: () => order.push('second'),
        },
        { id: 'final-id' },
      );

      expect(merged.className).to.equal('base extra');
      expect(merged.style).to.deep.equal({ color: 'red', fontWeight: 'bold' });
      expect(merged.disabled, 'an explicit undefined in a later object should not erase an earlier defined value').to.equal(true);
      expect(merged.id).to.equal('final-id');

      (merged.onClick as () => void)();
      expect(order, 'handlers should compose in argument order, earliest first').to.deep.equal(['first', 'second']);
    },
  },
  {
    name: 'Disclosure wires aria-expanded/aria-controls/data-state and toggles open state on trigger click',
    run: async ({ mod, render, screen, user, expect }) => {
      const Disclosure = getDisclosure(mod);
      render(
        <Disclosure.Root defaultOpen={false}>
          <Disclosure.Trigger>Toggle</Disclosure.Trigger>
          <Disclosure.Content>Details</Disclosure.Content>
        </Disclosure.Root>,
      );

      const trigger = screen.getByRole('button', { name: 'Toggle' });
      expect(trigger.getAttribute('aria-expanded')).to.equal('false');
      expect(trigger.getAttribute('data-state')).to.equal('closed');
      expect(screen.queryByText('Details'), 'content should not be in the DOM while closed without forceMount').to.equal(null);

      await user.click(trigger);

      expect(trigger.getAttribute('aria-expanded')).to.equal('true');
      const content = screen.getByText('Details');
      expect(content.getAttribute('data-state')).to.equal('open');
      expect(content.getAttribute('role')).to.equal('region');
      expect(content.getAttribute('aria-labelledby')).to.equal(trigger.id);
      expect(trigger.getAttribute('aria-controls')).to.equal(content.id);
    },
  },
  {
    name: 'controlled Disclosure: the open prop drives visibility and onOpenChange fires without the component changing itself',
    run: async ({ mod, render, screen, user, expect }) => {
      const Disclosure = getDisclosure(mod);
      const changes: boolean[] = [];

      render(
        <Disclosure.Root open={false} onOpenChange={(next: boolean) => changes.push(next)}>
          <Disclosure.Trigger>Toggle</Disclosure.Trigger>
          <Disclosure.Content>Details</Disclosure.Content>
        </Disclosure.Root>,
      );

      await user.click(screen.getByRole('button', { name: 'Toggle' }));

      expect(changes).to.deep.equal([true]);
      expect(screen.queryByText('Details'), 'the parent never applied the change, so content should still be absent').to.equal(null);
    },
  },
  {
    name: 'forceMount keeps the content element mounted, using the hidden attribute instead of removing it while closed',
    run: async ({ mod, render, expect }) => {
      const Disclosure = getDisclosure(mod);
      render(
        <Disclosure.Root defaultOpen={false}>
          <Disclosure.Trigger>Toggle</Disclosure.Trigger>
          <Disclosure.Content forceMount>Details</Disclosure.Content>
        </Disclosure.Root>,
      );

      const content = document.querySelector('[role="region"]') as HTMLElement | null;
      expect(content, 'the content element should still be in the DOM when forceMount is set').to.not.equal(null);
      expect(content!.getAttribute('data-state')).to.equal('closed');
      expect(content!.hidden).to.equal(true);
      expect(content!.textContent).to.equal('Details');
    },
  },
  {
    name: 'a className function prop receives { open } and its return value is applied to the element',
    run: async ({ mod, render, screen, user, expect }) => {
      const Disclosure = getDisclosure(mod);
      const seen: boolean[] = [];

      render(
        <Disclosure.Root defaultOpen={false}>
          <Disclosure.Trigger
            className={({ open }: { open: boolean }) => {
              seen.push(open);
              return open ? 'trigger open' : 'trigger closed';
            }}
          >
            Toggle
          </Disclosure.Trigger>
          <Disclosure.Content forceMount className={({ open }: { open: boolean }) => (open ? 'content open' : 'content closed')}>
            Details
          </Disclosure.Content>
        </Disclosure.Root>,
      );

      const trigger = screen.getByRole('button', { name: 'Toggle' });
      expect(trigger.className).to.equal('trigger closed');

      await user.click(trigger);

      expect(trigger.className).to.equal('trigger open');
      expect(seen).to.deep.equal([false, true]);
      const content = document.querySelector('[role="region"]') as HTMLElement;
      expect(content.className).to.equal('content open');
    },
  },
  {
    name: 'Portal renders its children into the given container element rather than in place',
    run: async ({ mod, render, expect }) => {
      const { Portal } = mod as { Portal: ComponentType<{ children: ReactNode; container?: Element | null }> };
      const container = document.createElement('div');
      container.setAttribute('data-testid', 'portal-container');
      document.body.appendChild(container);

      try {
        const { container: renderRoot } = render(
          <div data-testid="app-root">
            <Portal container={container}>
              <p data-testid="portaled">Hello</p>
            </Portal>
          </div>,
        );

        expect(renderRoot.querySelector('[data-testid="portaled"]'), 'the portaled node should not be inside the render root').to.equal(
          null,
        );
        expect(container.querySelector('[data-testid="portaled"]')?.textContent).to.equal('Hello');
      } finally {
        document.body.removeChild(container);
      }
    },
  },
];
