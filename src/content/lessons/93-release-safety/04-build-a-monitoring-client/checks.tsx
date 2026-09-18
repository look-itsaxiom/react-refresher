import type { Check } from '../../../types';
import * as React from 'react';
import { createRoot } from 'react-dom/client';

type BreadcrumbLevel = 'debug' | 'info' | 'warning' | 'error';
type Breadcrumb = { category: string; message: string; level: BreadcrumbLevel; timestamp: number };
type Mechanism = 'manual' | 'react-boundary' | 'react-uncaught' | 'react-recoverable';
type MonitorEvent = {
  name: string;
  message: string;
  stack?: string;
  release: string;
  mechanism: Mechanism;
  breadcrumbs: Breadcrumb[];
  extra?: Record<string, unknown>;
};
type MonitorConfig = {
  release: string;
  sampleRate: number;
  transport: (event: MonitorEvent) => void;
  beforeSend?: (event: MonitorEvent) => MonitorEvent | null;
  maxBreadcrumbs?: number;
  random?: () => number;
  dedupeWindowMs?: number;
};
type MonitorModule = {
  createMonitor: (config: MonitorConfig) => {
    addBreadcrumb: (b: { category: string; message: string; level: BreadcrumbLevel }) => void;
    captureException: (error: Error, context?: Record<string, unknown>, mechanism?: Mechanism) => void;
    scrub: (event: MonitorEvent) => MonitorEvent;
    installReactRootHandlers: () => {
      onCaughtError: (error: unknown, errorInfo: unknown) => void;
      onUncaughtError: (error: unknown, errorInfo: unknown) => void;
      onRecoverableError: (error: unknown, errorInfo: unknown) => void;
    };
    flush: () => void;
  };
  scrub: (event: MonitorEvent) => MonitorEvent;
};

function baseEvent(extra: Record<string, unknown>): MonitorEvent {
  return { name: 'Error', message: 'x', release: 'r1', mechanism: 'manual', breadcrumbs: [], extra };
}

export const checks: Check[] = [
  {
    name: 'scrub redacts sensitive keys (recursively) and emails/bearer tokens in string values',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { scrub } = mod as unknown as MonitorModule;
      const event = baseEvent({
        user: {
          email: 'jane@example.com',
          password: 'hunter2',
          profile: {
            authorization: 'Bearer abc.def.ghi',
            note: 'contact jane@example.com for access',
          },
        },
      });
      const scrubbed = scrub(event);
      expect(scrubbed.extra).to.deep.equal({
        user: {
          email: '[redacted]',
          password: '[redacted]',
          profile: {
            authorization: '[redacted]',
            note: 'contact [redacted] for access',
          },
        },
      });
    },
  },
  {
    name: 'captureException sends the transport a scrubbed payload',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createMonitor } = mod as unknown as MonitorModule;
      const received: MonitorEvent[] = [];
      const monitor = createMonitor({
        release: 'r1',
        sampleRate: 1,
        random: () => 0,
        transport: (event) => received.push(event),
      });
      monitor.captureException(new Error('boom'), { token: 'sekret-value', contact: 'jane@example.com' });
      expect(received).to.have.length(1);
      expect(received[0]?.extra).to.deep.equal({ token: '[redacted]', contact: '[redacted]' });
    },
  },
  {
    name: 'breadcrumbs are capped at maxBreadcrumbs and kept in chronological order',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createMonitor } = mod as unknown as MonitorModule;
      const received: MonitorEvent[] = [];
      const monitor = createMonitor({
        release: 'r1',
        sampleRate: 1,
        random: () => 0,
        maxBreadcrumbs: 3,
        transport: (event) => received.push(event),
      });
      for (let i = 0; i < 6; i++) {
        monitor.addBreadcrumb({ category: 'ui', message: `b${i}`, level: 'info' });
      }
      monitor.captureException(new Error('boom'));
      expect(received[0]?.breadcrumbs.map((b) => b.message)).to.deep.equal(['b3', 'b4', 'b5']);
    },
  },
  {
    name: 'a captured event snapshots breadcrumbs at capture time, not a live reference',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createMonitor } = mod as unknown as MonitorModule;
      const received: MonitorEvent[] = [];
      const monitor = createMonitor({
        release: 'r1',
        sampleRate: 1,
        random: () => 0,
        transport: (event) => received.push(event),
      });
      monitor.addBreadcrumb({ category: 'ui', message: 'before', level: 'info' });
      monitor.captureException(new Error('boom'));
      monitor.addBreadcrumb({ category: 'ui', message: 'after', level: 'info' });
      expect(received[0]?.breadcrumbs.map((b) => b.message)).to.deep.equal(['before']);
    },
  },
  {
    name: 'sampling only sends when the injected random() is below sampleRate',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createMonitor } = mod as unknown as MonitorModule;
      const included: MonitorEvent[] = [];
      const excluded: MonitorEvent[] = [];
      const includeMonitor = createMonitor({
        release: 'r1',
        sampleRate: 0.5,
        random: () => 0.1,
        transport: (event) => included.push(event),
      });
      const excludeMonitor = createMonitor({
        release: 'r1',
        sampleRate: 0.5,
        random: () => 0.9,
        transport: (event) => excluded.push(event),
      });
      includeMonitor.captureException(new Error('a'));
      excludeMonitor.captureException(new Error('b'));
      expect(included).to.have.length(1);
      expect(excluded).to.have.length(0);
    },
  },
  {
    name: 'an identical error (same name, message, stack) within the dedupe window is dropped',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createMonitor } = mod as unknown as MonitorModule;
      const received: MonitorEvent[] = [];
      const monitor = createMonitor({
        release: 'r1',
        sampleRate: 1,
        random: () => 0,
        dedupeWindowMs: 60_000,
        transport: (event) => received.push(event),
      });
      const err = new Error('repeat me');
      monitor.captureException(err);
      monitor.captureException(err);
      monitor.captureException(err);
      expect(received).to.have.length(1);
    },
  },
  {
    name: 'beforeSend can drop an event by returning null',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createMonitor } = mod as unknown as MonitorModule;
      const received: MonitorEvent[] = [];
      const monitor = createMonitor({
        release: 'r1',
        sampleRate: 1,
        random: () => 0,
        beforeSend: () => null,
        transport: (event) => received.push(event),
      });
      monitor.captureException(new Error('dropped'));
      expect(received).to.have.length(0);
    },
  },
  {
    name: 'installReactRootHandlers wired into createRoot tags a boundary-caught error as react-boundary',
    run: async (ctx) => {
      const { mod, expect, act } = ctx;
      const { createMonitor } = mod as unknown as MonitorModule;
      const received: MonitorEvent[] = [];
      const monitor = createMonitor({
        release: 'r1',
        sampleRate: 1,
        random: () => 0,
        transport: (event) => received.push(event),
      });

      class Boundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
        state = { hasError: false };
        static getDerivedStateFromError() {
          return { hasError: true };
        }
        componentDidCatch() {}
        render() {
          return this.state.hasError ? <div>fallback</div> : this.props.children;
        }
      }
      function Throws(): React.ReactElement {
        throw new Error('render blew up');
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container, monitor.installReactRootHandlers());

      await act(async () => {
        root.render(
          <Boundary>
            <Throws />
          </Boundary>,
        );
      });

      expect(received.some((e) => e.mechanism === 'react-boundary' && e.message === 'render blew up')).to.equal(true);

      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  },
];
