import { Suspense, use, useMemo } from 'react';
import { MarkdownHooks } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const remarkPlugins = [remarkGfm];

let highlighterPromise: Promise<HighlighterCore> | null = null;
/** One highlighter for the whole app; a module-level promise so `use()` reads the same promise every render. */
function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [import('@shikijs/themes/github-light'), import('@shikijs/themes/github-dark')],
    langs: [
      import('@shikijs/langs/tsx'), import('@shikijs/langs/typescript'),
      import('@shikijs/langs/jsx'), import('@shikijs/langs/javascript'),
      import('@shikijs/langs/bash'), import('@shikijs/langs/json'),
      import('@shikijs/langs/html'), import('@shikijs/langs/css'),
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighterPromise;
}

function MarkdownContent({ source }: { source: string }) {
  const highlighter = use(getHighlighter());
  const rehypePlugins = useMemo(
    () =>
      // react-markdown's plugin tuple type is wide; the cast keeps the options object typed above.
      [[rehypeShikiFromHighlighter, highlighter, { themes: { light: 'github-light', dark: 'github-dark' }, fallbackLanguage: 'text' }]] as unknown as NonNullable<
        Parameters<typeof MarkdownHooks>[0]['rehypePlugins']
      >,
    [highlighter],
  );
  return (
    <MarkdownHooks
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      fallback={<p className="text-ink-muted text-sm">Rendering…</p>}
    >
      {source}
    </MarkdownHooks>
  );
}

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  return (
    <div className={`prose-refresher ${className}`}>
      <Suspense fallback={<p className="text-ink-muted text-sm">Rendering…</p>}>
        <MarkdownContent source={source} />
      </Suspense>
    </div>
  );
}
