import type { Check } from '../../../types';

function uniqueSuffix(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

type TickerModule = { define: (suffix: string) => string };

function spyOnWindowIntervals() {
  const originalSet = window.setInterval;
  const originalClear = window.clearInterval;
  let active = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).setInterval = (...args: unknown[]) => {
    active += 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalSet as any)(...args);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).clearInterval = (id: unknown) => {
    if (id !== null && id !== undefined) active -= 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalClear as any)(id);
  };
  return {
    activeCount: () => active,
    restore: () => {
      window.setInterval = originalSet;
      window.clearInterval = originalClear;
    },
  };
}

export const checks: Check[] = [
  {
    name: 'connecting reacts to a window resize; disconnecting stops reacting to later resizes',
    run: async ({ mod, expect, sleep }) => {
      const { define } = mod as unknown as TickerModule;
      const tag = define(uniqueSuffix());

      const connected = document.createElement(tag);
      document.body.append(connected);
      window.dispatchEvent(new Event('resize'));
      await sleep(10);
      expect(connected.textContent, 'a resize while connected should be reflected').to.include('(resized)');
      connected.remove();

      const disconnected = document.createElement(tag);
      document.body.append(disconnected);
      disconnected.remove();
      window.dispatchEvent(new Event('resize'));
      await sleep(10);
      expect(disconnected.textContent, 'a resize after disconnecting should not be reflected').to.not.include(
        '(resized)',
      );
    },
  },
  {
    name: 'disconnecting clears the interval; reconnecting never leaves more than one active',
    run: ({ mod, expect }) => {
      const { define } = mod as unknown as TickerModule;
      const tag = define(uniqueSuffix());
      const timers = spyOnWindowIntervals();
      try {
        const el = document.createElement(tag);
        document.body.append(el);
        expect(timers.activeCount(), 'connecting should start exactly one interval').to.equal(1);
        el.remove();
        expect(timers.activeCount(), 'disconnecting should clear the interval').to.equal(0);

        document.body.append(el);
        el.remove();
        document.body.append(el);
        expect(timers.activeCount(), 'exactly one interval should be active after two reconnects').to.equal(1);
        el.remove();
        expect(timers.activeCount(), 'no interval should remain once fully disconnected').to.equal(0);
      } finally {
        timers.restore();
      }
    },
  },
  {
    name: 'no resize listener leaks after several connect/disconnect cycles',
    run: async ({ mod, expect, sleep }) => {
      const { define } = mod as unknown as TickerModule;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag);

      document.body.append(el);
      el.remove();
      document.body.append(el);
      el.remove();
      document.body.append(el);
      el.remove(); // fully disconnected after three connect/disconnect cycles

      window.dispatchEvent(new Event('resize'));
      await sleep(10);
      document.body.append(el);
      await sleep(10);
      expect(
        el.textContent,
        'a resize dispatched while disconnected must not be picked up by a listener left over from an earlier connection',
      ).to.not.include('(resized)');
      el.remove();
    },
  },
  {
    name: 'the ticker stops updating once disconnected',
    run: async ({ mod, expect, sleep }) => {
      const { define } = mod as unknown as TickerModule;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag);
      document.body.append(el);
      await sleep(60);
      el.remove();
      const textAtDisconnect = el.textContent;
      await sleep(60);
      expect(el.textContent, 'text should not change after the element disconnects').to.equal(textAtDisconnect);
    },
  },
  {
    name: 'disconnecting twice in a row does not throw',
    run: ({ mod, expect }) => {
      const { define } = mod as unknown as TickerModule;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag) as HTMLElement & { disconnectedCallback?: () => void };
      document.body.append(el);
      el.remove();
      expect(() => el.disconnectedCallback?.()).to.not.throw();
    },
  },
];
