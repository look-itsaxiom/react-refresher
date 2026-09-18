// --- provided: a complete, working sanitizer. Do not modify. ---
type SanitizePolicy = { tags: Record<string, string[]> };

const DEFAULT_POLICY: SanitizePolicy = {
  tags: {
    p: [], b: [], i: [], em: [], strong: [],
    ul: [], ol: [], li: [], code: [], pre: [], br: [],
    a: ['href', 'target'],
    img: ['src', 'alt'],
  },
};

const REMOVE_ENTIRELY = new Set(['script', 'style', 'iframe', 'object', 'embed']);
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

export function isSafeUrl(value: string): boolean {
  try {
    return SAFE_SCHEMES.has(new URL(value, 'https://example.invalid').protocol);
  } catch {
    return false;
  }
}

function clean(node: Node, policy: SanitizePolicy): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (REMOVE_ENTIRELY.has(tag)) {
      el.remove();
      continue;
    }
    clean(el, policy);

    const allowedAttrs = policy.tags[tag];
    if (!allowedAttrs) {
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
// --- end provided sanitizer ---

type Comment = {
  id: string;
  author: string;
  /** Rich-text preview, rendered to HTML by the (untrusted) client. */
  bodyHtml: string;
  /** Link to the author's profile -- typed in by the author, not validated by the API. */
  profileUrl: string;
  /** Arbitrary attributes the API asks the client to attach to the byline. */
  meta: Record<string, string>;
};

const comments: Comment[] = [
  {
    id: 'c1',
    author: 'Priya',
    bodyHtml: '<p>Great post! Check <b>this</b> out.</p>',
    profileUrl: 'https://example.com/priya',
    meta: { 'data-role': 'member' },
  },
  {
    id: 'c2',
    author: 'anon',
    bodyHtml: '<img src=x onerror="alert(document.cookie)"><p>nice</p>',
    profileUrl: 'javascript:alert(document.cookie)',
    meta: { onmouseover: 'alert(1)', style: 'color:red' },
  },
];

function CommentThread() {
  return (
    <ul>
      {comments.map((c) => (
        <li key={c.id}>
          {isSafeUrl(c.profileUrl) ? <a href={c.profileUrl}>{c.author}</a> : <span>{c.author}</span>}
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.bodyHtml) }} />
        </li>
      ))}
    </ul>
  );
}

export default CommentThread;
