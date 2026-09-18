export type SanitizePolicy = {
  /** tag name (lowercase) -> allowed attribute names (lowercase) */
  tags: Record<string, string[]>;
};

export const DEFAULT_POLICY: SanitizePolicy = {
  tags: {
    p: [],
    b: [],
    i: [],
    em: [],
    strong: [],
    ul: [],
    ol: [],
    li: [],
    code: [],
    pre: [],
    br: [],
    a: ['href', 'target'],
    img: ['src', 'alt'],
  },
};

export function sanitizeHtml(html: string, policy: SanitizePolicy = DEFAULT_POLICY): string {
  // TODO: parse with DOMParser, walk the tree, and only keep what `policy` allows.
  // This naive version returns the input untouched -- it does not sanitize anything.
  return html;
}

const SAMPLE = '<p>Hello <b>world</b>, visit <a href="https://example.com">us</a>.</p><img src=x onerror="alert(1)">';

export default function App() {
  return (
    <div>
      <h3>Sanitized preview</h3>
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(SAMPLE) }} />
    </div>
  );
}
