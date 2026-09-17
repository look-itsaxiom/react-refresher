import { MarkdownHooks } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeShiki from '@shikijs/rehype';

const rehypePlugins = [[rehypeShiki, { themes: { light: 'github-light', dark: 'github-dark' } }]] as const;
const remarkPlugins = [remarkGfm];

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  return (
    <div className={`prose-refresher ${className}`}>
      <MarkdownHooks
        remarkPlugins={remarkPlugins}
        // react-markdown's plugin tuple type is wide; the cast keeps the options object typed above.
        rehypePlugins={rehypePlugins as unknown as NonNullable<Parameters<typeof MarkdownHooks>[0]['rehypePlugins']>}
        fallback={<p className="text-ink-muted text-sm">Rendering…</p>}
      >
        {source}
      </MarkdownHooks>
    </div>
  );
}
