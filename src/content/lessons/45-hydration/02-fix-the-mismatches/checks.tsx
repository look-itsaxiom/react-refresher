import type { Check } from '../../../types';

type Mod = {
  serverHtml: () => string;
  hydrateInto: (container: HTMLElement, onRecoverableError?: (error: unknown, errorInfo: unknown) => void) => unknown;
};

/** Runs `fn` with the global `Date` frozen at `fixedMs`, then restores it. */
function withFixedDate<T>(fixedMs: number, fn: () => T): T {
  const RealDate = globalThis.Date;
  function FakeDate(...args: unknown[]) {
    // @ts-expect-error - constructing a Date with a variable argument list
    return args.length ? new RealDate(...args) : new RealDate(fixedMs);
  }
  FakeDate.now = () => fixedMs;
  FakeDate.prototype = RealDate.prototype;
  globalThis.Date = FakeDate as unknown as typeof Date;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

function mount(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

export const checks: Check[] = [
  {
    name: 'hydrating a timestamp rendered at a different instant than the server causes no recoverable error and reuses the DOM',
    run: async (ctx) => {
      const { mod, act, expect } = ctx;
      const { serverHtml, hydrateInto } = mod as unknown as Mod;
      // The server "saw" a fixed instant; the client hydrates at the real
      // current time, which is guaranteed to differ.
      const html = withFixedDate(1735700000000, () => serverHtml());
      const container = mount(html);
      const serverNode = container.querySelector('[data-testid="panel"]');
      let errors = 0;
      await act(async () => {
        hydrateInto(container, () => {
          errors += 1;
        });
      });
      expect(errors, 'onRecoverableError calls while hydrating the timestamp').to.equal(0);
      const clientNode = container.querySelector('[data-testid="panel"]');
      expect(clientNode, 'hydration should reuse the server-rendered panel, not replace it').to.equal(serverNode);
      document.body.removeChild(container);
    },
  },
  {
    name: 'the panel id is derived from tree position, not regenerated randomly on each render',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { serverHtml } = mod as unknown as Mod;
      const first = mount(serverHtml());
      const second = mount(serverHtml());
      const firstId = first.querySelector('[data-testid="panel"]')?.getAttribute('id');
      const secondId = second.querySelector('[data-testid="panel"]')?.getAttribute('id');
      expect(firstId, 'panel should have an id').to.be.a('string').and.not.equal('');
      expect(secondId, 'two independent renders of the same tree should produce the same id').to.equal(firstId);
      document.body.removeChild(first);
      document.body.removeChild(second);
    },
  },
  {
    name: 'hydrating on a narrower viewport than the server assumed causes no recoverable error, and the layout label self-corrects and keeps reacting to resize',
    run: async (ctx) => {
      const { mod, act, expect } = ctx;
      const { serverHtml, hydrateInto } = mod as unknown as Mod;
      const realInnerWidth = window.innerWidth;
      try {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
        const html = serverHtml();
        const container = mount(html);
        const serverNode = container.querySelector('[data-testid="panel"]');

        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 320 });
        let errors = 0;
        await act(async () => {
          hydrateInto(container, () => {
            errors += 1;
          });
        });
        expect(errors, 'onRecoverableError calls while hydrating on a narrower viewport than the server assumed').to.equal(0);
        const clientNode = container.querySelector('[data-testid="panel"]');
        expect(clientNode, 'hydration should reuse the server-rendered panel, not replace it').to.equal(serverNode);
        expect(container.querySelector('[data-testid="layout"]')?.textContent, 'label should self-correct to the real (narrow) viewport after hydration').to.equal('narrow');

        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 900 });
        await act(async () => {
          window.dispatchEvent(new Event('resize'));
        });
        expect(container.querySelector('[data-testid="layout"]')?.textContent, 'label should keep reacting to resize events after hydration').to.equal('wide');

        document.body.removeChild(container);
      } finally {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: realInnerWidth });
      }
    },
  },
];
