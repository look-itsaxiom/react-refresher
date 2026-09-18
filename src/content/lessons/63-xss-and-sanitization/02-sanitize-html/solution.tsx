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

const REMOVE_ENTIRELY = new Set(['script', 'style', 'iframe', 'object', 'embed']);
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

function isSafeUrl(value: string): boolean {
  try {
    return SAFE_SCHEMES.has(new URL(value, 'https://example.invalid').protocol);
  } catch {
    return false;
  }
}

function clean(node: Node, policy: SanitizePolicy): void {
  // Snapshot the live child list before mutating it.
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (REMOVE_ENTIRELY.has(tag)) {
      el.remove();
      continue;
    }

    // Depth-first: children are already clean by the time we decide the parent's fate.
    clean(el, policy);

    const allowedAttrs = policy.tags[tag];
    if (!allowedAttrs) {
      // Not an allowed tag: unwrap it, keeping its (clean) children in its place.
      while (el.firstChild) node.insertBefore(el.firstChild, el);
      el.remove();
      continue;
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const isUrlAttr = name === 'href' || name === 'src';
      const drop = name.startsWith('on') || !allowedAttrs.includes(name) || (isUrlAttr && !isSafeUrl(attr.value));
      if (drop) el.removeAttribute(attr.name);
    }

    if (tag === 'a' && el.hasAttribute('target')) {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }
}

export function sanitizeHtml(html: string, policy: SanitizePolicy = DEFAULT_POLICY): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  clean(doc.body, policy);
  return doc.body.innerHTML;
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
