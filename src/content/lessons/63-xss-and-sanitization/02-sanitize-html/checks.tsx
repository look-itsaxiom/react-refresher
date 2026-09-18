import type { Check } from '../../../types';

type Mod = {
  sanitizeHtml: (html: string, policy?: unknown) => string;
};

function parse(html: string): Document {
  return new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
}

function allAttributeNames(doc: Document): string[] {
  const names: string[] = [];
  // Skip the #root wrapper itself -- only inspect what sanitizeHtml actually produced.
  doc.querySelectorAll('#root *').forEach((el) => {
    for (const attr of Array.from(el.attributes)) names.push(attr.name.toLowerCase());
  });
  return names;
}

export const checks: Check[] = [
  {
    name: 'strips on* attributes, e.g. <img src=x onerror=alert(1)>',
    run: async ({ mod, expect }) => {
      const { sanitizeHtml } = mod as unknown as Mod;
      const out = sanitizeHtml('<p>hi</p><img src=x onerror="alert(1)">');
      const doc = parse(out);
      expect(allAttributeNames(doc).some((n) => n.startsWith('on')), 'no on* attribute should survive').to.equal(false);
    },
  },
  {
    name: 'rejects an entity-encoded javascript: URL in href',
    run: async ({ mod, expect }) => {
      const { sanitizeHtml } = mod as unknown as Mod;
      const out = sanitizeHtml('<a href="javas&#99;ript:alert(1)">click</a>');
      const doc = parse(out);
      const link = doc.querySelector('a');
      const href = link?.getAttribute('href') ?? '';
      expect(href.toLowerCase(), 'href must not contain a javascript: scheme').to.not.include('javascript:');
    },
  },
  {
    name: 'rejects a javascript: URL hidden behind leading whitespace',
    run: async ({ mod, expect }) => {
      const { sanitizeHtml } = mod as unknown as Mod;
      const out = sanitizeHtml('<a href="   javascript:alert(1)">click</a>');
      const doc = parse(out);
      const href = doc.querySelector('a')?.getAttribute('href') ?? '';
      expect(href.toLowerCase(), 'whitespace must not smuggle a javascript: scheme past validation').to.not.include('javascript:');
    },
  },
  {
    name: 'removes <script> and its content entirely, even nested inside <svg>',
    run: async ({ mod, expect }) => {
      const { sanitizeHtml } = mod as unknown as Mod;
      const out = sanitizeHtml('<svg><script>alert(1)</script></svg><p>safe</p>');
      expect(out.toLowerCase(), 'no script tag should remain').to.not.include('<script');
      expect(out, 'the alert(1) payload text should not survive either').to.not.include('alert(1)');
      const doc = parse(out);
      expect(doc.querySelector('script'), 'no script element in the parsed output').to.equal(null);
    },
  },
  {
    name: 'removes <style> content entirely, not just the tag',
    run: async ({ mod, expect }) => {
      const { sanitizeHtml } = mod as unknown as Mod;
      const out = sanitizeHtml('<style>body{background:url(evil)}</style><p>ok</p>');
      expect(out, 'style rule text should not leak into the output').to.not.include('background');
      const doc = parse(out);
      expect(doc.querySelector('p')?.textContent).to.equal('ok');
    },
  },
  {
    name: 'unwraps a disallowed tag (e.g. <div onclick=...>) but keeps its text',
    run: async ({ mod, expect }) => {
      const { sanitizeHtml } = mod as unknown as Mod;
      const out = sanitizeHtml('<div onclick="alert(1)">click me</div>');
      const doc = parse(out);
      expect(doc.querySelector('div:not(#root)'), 'div is not in the default policy and should be unwrapped').to.equal(null);
      expect(allAttributeNames(doc).length, 'no attributes should survive on any element').to.equal(0);
      expect(doc.getElementById('root')?.textContent).to.include('click me');
    },
  },
  {
    name: 'forces rel="noopener noreferrer" on an anchor with target',
    run: async ({ mod, expect }) => {
      const { sanitizeHtml } = mod as unknown as Mod;
      const out = sanitizeHtml('<a href="https://example.com" target="_blank">link</a>');
      const doc = parse(out);
      const link = doc.querySelector('a');
      expect(link?.getAttribute('href')).to.equal('https://example.com');
      expect(link?.getAttribute('rel')).to.equal('noopener noreferrer');
    },
  },
  {
    name: 'preserves benign formatting: nested tags, text, and a safe link all survive',
    run: async ({ mod, expect }) => {
      const { sanitizeHtml } = mod as unknown as Mod;
      const out = sanitizeHtml('<p>Hello <b>world</b>, visit <a href="https://example.com">us</a>.</p>');
      const doc = parse(out);
      expect(doc.querySelector('p')).to.not.equal(null);
      expect(doc.querySelector('b')?.textContent).to.equal('world');
      expect(doc.querySelector('a')?.getAttribute('href')).to.equal('https://example.com');
      expect(doc.getElementById('root')?.textContent).to.include('Hello');
      expect(doc.getElementById('root')?.textContent).to.include('visit');
    },
  },
  {
    name: 'a math/mi mutation-XSS-style payload leaves no script and no data: URL',
    run: async ({ mod, expect }) => {
      const { sanitizeHtml } = mod as unknown as Mod;
      const out = sanitizeHtml('<math><mi//xlink:href="data:x,<script>alert(1)</script>">click</mi></math><p>safe</p>');
      expect(out.toLowerCase(), 'no script tag should survive the math/mi payload').to.not.include('<script');
      expect(out.toLowerCase(), 'no data: URL should survive').to.not.include('data:');
      const doc = parse(out);
      expect(doc.getElementById('root')?.textContent).to.include('safe');
    },
  },
];
