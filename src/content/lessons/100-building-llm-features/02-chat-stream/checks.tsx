import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

type SSEFrame = { event?: string; data: string };
type ChatClient = { send: (text: string, signal?: AbortSignal) => ReadableStream<Uint8Array> };
type ChatProps = { client: ChatClient };

type Mod = {
  parseSSE: (stream: ReadableStream<Uint8Array>) => AsyncGenerator<SSEFrame>;
  makeStreamFromChunks: (chunks: string[], delayMs?: number) => ReadableStream<Uint8Array>;
  makeSSEClient: (frames: string[], opts?: { delayMs?: number }) => ChatClient;
  Chat: (props: ChatProps) => React.ReactElement;
};

function frame(data: unknown, event?: string): string {
  return (event ? `event: ${event}\n` : '') + `data: ${JSON.stringify(data)}\n\n`;
}

async function collect(gen: AsyncGenerator<SSEFrame>): Promise<SSEFrame[]> {
  const out: SSEFrame[] = [];
  for await (const f of gen) out.push(f);
  return out;
}

export const checks: Check[] = [
  {
    name: 'parseSSE reassembles a frame split across three chunks',
    run: async ({ mod, expect }) => {
      const { parseSSE, makeStreamFromChunks } = mod as unknown as Mod;
      const raw = frame({ hello: 'world' });
      const chunks = [raw.slice(0, 5), raw.slice(5, 12), raw.slice(12)];
      const frames = await collect(parseSSE(makeStreamFromChunks(chunks, 0)));
      expect(frames).to.deep.equal([{ event: undefined, data: JSON.stringify({ hello: 'world' }) }]);
    },
  },
  {
    name: 'parseSSE joins multiple data: lines in one frame with \\n',
    run: async ({ mod, expect }) => {
      const { parseSSE, makeStreamFromChunks } = mod as unknown as Mod;
      const raw = 'data: line one\ndata: line two\n\n';
      const frames = await collect(parseSSE(makeStreamFromChunks([raw], 0)));
      expect(frames).to.have.length(1);
      expect(frames[0]?.data).to.equal('line one\nline two');
    },
  },
  {
    name: 'parseSSE ignores comment lines and captures an event: field',
    run: async ({ mod, expect }) => {
      const { parseSSE, makeStreamFromChunks } = mod as unknown as Mod;
      const raw = ': this is a comment\nevent: ping\ndata: {"ok":true}\n\n';
      const frames = await collect(parseSSE(makeStreamFromChunks([raw], 0)));
      expect(frames).to.have.length(1);
      expect(frames[0]?.event).to.equal('ping');
      expect(frames[0]?.data).to.equal('{"ok":true}');
    },
  },
  {
    name: 'parseSSE treats CRLF line endings the same as LF',
    run: async ({ mod, expect }) => {
      const { parseSSE, makeStreamFromChunks } = mod as unknown as Mod;
      const raw = 'data: crlf-frame\r\n\r\n';
      const frames = await collect(parseSSE(makeStreamFromChunks([raw], 0)));
      expect(frames).to.deep.equal([{ event: undefined, data: 'crlf-frame' }]);
    },
  },
  {
    name: 'parseSSE yields a trailing frame even without a final blank line',
    run: async ({ mod, expect }) => {
      const { parseSSE, makeStreamFromChunks } = mod as unknown as Mod;
      const chunks = ['data: first\n\ndata: trailing-no-blank-line'];
      const frames = await collect(parseSSE(makeStreamFromChunks(chunks, 0)));
      expect(frames).to.deep.equal([
        { event: undefined, data: 'first' },
        { event: undefined, data: 'trailing-no-blank-line' },
      ]);
    },
  },
  {
    name: 'sending a message shows the user text immediately and streams the assistant reply to completion',
    run: async ({ mod, render, screen, user, expect }) => {
      const { Chat, makeSSEClient } = mod as unknown as Mod;
      const frames = [
        ...'Hi!'.split('').map((delta) => frame({ type: 'text-delta', delta })),
        frame({ type: 'done' }),
      ];
      const client = makeSSEClient(frames, { delayMs: 8 });
      render(<Chat client={client} />);

      await user.type(screen.getByLabelText(/message/i), 'hello');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => expect(screen.getByText('hello')).to.exist);

      await waitFor(
        () => {
          const li = document.querySelector('li[data-role="assistant"]');
          expect(li?.getAttribute('data-status')).to.equal('done');
          expect(li?.textContent).to.include('Hi!');
        },
        { timeout: 2000 },
      );
    },
  },
  {
    name: 'a tool-call event renders a ToolCallCard with the tool name',
    run: async ({ mod, render, screen, user, expect }) => {
      const { Chat, makeSSEClient } = mod as unknown as Mod;
      const frames = [
        frame({ type: 'tool-call', name: 'lookupWeather', args: { city: 'Denver' } }),
        frame({ type: 'text-delta', delta: 'checking…' }),
        frame({ type: 'done' }),
      ];
      const client = makeSSEClient(frames, { delayMs: 8 });
      render(<Chat client={client} />);

      await user.type(screen.getByLabelText(/message/i), 'weather?');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => expect(screen.getByText('lookupWeather')).to.exist, { timeout: 2000 });
    },
  },
  {
    name: 'Stop keeps the partial assistant text and marks the message stopped',
    run: async ({ mod, render, screen, user, sleep, expect }) => {
      const { Chat, makeSSEClient } = mod as unknown as Mod;
      const frames = [
        ...'a very long reply that should not fully arrive'.split('').map((delta) => frame({ type: 'text-delta', delta })),
        frame({ type: 'done' }),
      ];
      const client = makeSSEClient(frames, { delayMs: 15 });
      render(<Chat client={client} />);

      await user.type(screen.getByLabelText(/message/i), 'go');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        const li = document.querySelector('li[data-role="assistant"]');
        expect((li?.textContent ?? '').length).to.be.greaterThan(0);
      });

      await user.click(screen.getByRole('button', { name: /stop/i }));
      await sleep(150);

      const li = document.querySelector('li[data-role="assistant"]');
      expect(li?.getAttribute('data-status')).to.equal('stopped');
      expect(li?.textContent ?? '').to.not.include('a very long reply that should not fully arrive');
      expect((li?.textContent ?? '').length).to.be.greaterThan(0);
    },
  },
  {
    name: 'the aria-live region contains the completed assistant text once the reply finishes',
    run: async ({ mod, render, screen, user, expect }) => {
      const { Chat, makeSSEClient } = mod as unknown as Mod;
      const frames = [
        ...'Done!'.split('').map((delta) => frame({ type: 'text-delta', delta })),
        frame({ type: 'done' }),
      ];
      const client = makeSSEClient(frames, { delayMs: 5 });
      render(<Chat client={client} />);

      await user.type(screen.getByLabelText(/message/i), 'ping');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(
        () => {
          const live = document.querySelector('[aria-live="polite"]');
          expect(live?.textContent).to.equal('Done!');
        },
        { timeout: 2000 },
      );
    },
  },
];
