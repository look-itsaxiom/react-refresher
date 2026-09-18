import { useEffect, useRef, useState } from 'react';

export type TemplateResult = { strings: TemplateStringsArray; values: unknown[] };

export function html(strings: TemplateStringsArray, ...values: unknown[]): TemplateResult {
  return { strings, values };
}

type AttrBinding = { name: string; kind: 'attr' | 'prop' | 'event' };
type Part =
  | { kind: 'text'; node: Text }
  | { kind: 'attr'; el: Element; name: string }
  | { kind: 'prop'; el: Element; name: string }
  | { kind: 'event'; el: Element; name: string; handler: EventListener | null }
  | { kind: 'list'; marker: Comment; nodes: ChildNode[] };

type Instance = { strings: TemplateStringsArray; values: unknown[]; parts: Part[] };
const instances = new WeakMap<Element, Instance>();

// Parses the static template once per unique `strings` array: dynamic text positions become an
// HTML comment marker (`<!--@N-->`); dynamic attribute/prop/event positions become a temporary
// `data-bind-N` marker attribute that `bindInitial` locates and strips off. Given, correct.
function buildFragment(strings: TemplateStringsArray): { fragment: DocumentFragment; attrBindings: AttrBinding[] } {
  const raw = [...strings];
  const attrBindings: AttrBinding[] = [];
  let out = raw[0] ?? '';
  for (let i = 0; i < strings.length - 1; i++) {
    const current = raw[i] ?? '';
    const m = /((?:@|\.)?[a-zA-Z0-9_-]+)=["']$/.exec(current);
    let next = raw[i + 1] ?? '';
    if (m) {
      const rawName = m[1] ?? '';
      const kind: AttrBinding['kind'] = rawName.startsWith('@') ? 'event' : rawName.startsWith('.') ? 'prop' : 'attr';
      const name = kind === 'attr' ? rawName : rawName.slice(1);
      attrBindings.push({ name, kind });
      out = out.slice(0, out.length - m[0].length) + ` data-bind-${i}="1"`;
      next = next.replace(/^["']/, '');
    } else {
      out += `<!--@${i}-->`;
    }
    out += next;
  }
  const tmpl = document.createElement('template');
  tmpl.innerHTML = out;
  return { fragment: tmpl.content, attrBindings };
}

// Walks the comment markers left by buildFragment and creates a real (empty) Text node right
// after each one — that Text node's `.data` is what gets mutated on every future update. Given,
// correct.
function resolveParts(container: ParentNode, valueCount: number): Part[] {
  const parts: Part[] = new Array(valueCount);
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_COMMENT);
  let node: Comment | null;
  while ((node = walker.nextNode() as Comment | null)) {
    const match = /^@(\d+)$/.exec(node.data);
    if (!match) continue;
    const idx = Number(match[1]);
    const textNode = document.createTextNode('');
    node.after(textNode);
    parts[idx] = { kind: 'text', node: textNode };
  }
  return parts;
}

// Dispatches on whether this marked position came from `attr=`, `.prop=`, or `@event=`.
function applyBinding(el: Element, binding: AttrBinding, value: unknown, parts: Part[], idx: number): void {
  if (binding.kind === 'attr') {
    if (value === false || value === null || value === undefined) el.removeAttribute(binding.name);
    else el.setAttribute(binding.name, value === true ? '' : String(value));
    parts[idx] = { kind: 'attr', el, name: binding.name };
  } else if (binding.kind === 'prop') {
    (el as unknown as Record<string, unknown>)[binding.name] = value;
    parts[idx] = { kind: 'prop', el, name: binding.name };
  } else {
    el.addEventListener(binding.name, value as EventListener);
    parts[idx] = { kind: 'event', el, name: binding.name, handler: value as EventListener };
  }
}

// For each dynamic position: if it's an attribute/prop/event marker, hand it to applyBinding; if
// it's a text position whose value is an array, render each item and splice the resulting nodes
// in after the marker comment; otherwise just set the text node's data. Given, correct.
function bindInitial(container: Element, parts: Part[], attrBindings: AttrBinding[], values: unknown[]): void {
  const bindings = [...attrBindings];
  for (let i = 0; i < values.length; i++) {
    const el = container.querySelector(`[data-bind-${i}]`);
    if (el) {
      const binding = bindings.shift()!;
      el.removeAttribute(`data-bind-${i}`);
      applyBinding(el, binding, values[i], parts, i);
      continue;
    }
    const part = parts[i];
    if (part && part.kind === 'text' && Array.isArray(values[i])) {
      const marker = part.node.previousSibling as Comment;
      const nodes = renderList(values[i] as TemplateResult[]);
      part.node.remove();
      let anchor: ChildNode = marker;
      for (const n of nodes) {
        anchor.after(n);
        anchor = n;
      }
      parts[i] = { kind: 'list', marker, nodes };
    } else if (part && part.kind === 'text') {
      part.node.data = values[i] == null ? '' : String(values[i]);
    }
  }
}

// Renders each item template into a detached container and returns its nodes. Given, correct.
function renderList(items: TemplateResult[]): ChildNode[] {
  const out: ChildNode[] = [];
  for (const item of items) {
    const temp = document.createElement('div');
    const { fragment, attrBindings } = buildFragment(item.strings);
    temp.appendChild(fragment);
    const parts = resolveParts(temp, item.values.length);
    bindInitial(temp, parts, attrBindings, item.values);
    out.push(...Array.from(temp.childNodes));
  }
  return out;
}

export function render(template: TemplateResult, container: Element): void {
  const previous = instances.get(container);
  if (previous && previous.strings === template.strings) {
    for (let i = 0; i < template.values.length; i++) {
      const part = previous.parts[i];
      const value = template.values[i];
      const oldValue = previous.values[i];
      if (!part) continue;
      if (part.kind === 'list') {
        if (Object.is(value, oldValue)) continue;
        for (const n of part.nodes) n.remove();
        const nodes = renderList(value as TemplateResult[]);
        let anchor: ChildNode = part.marker;
        for (const n of nodes) {
          anchor.after(n);
          anchor = n;
        }
        part.nodes = nodes;
        continue;
      }
      if (Object.is(value, oldValue)) continue;
      if (part.kind === 'text') {
        part.node.data = value == null ? '' : String(value);
      } else if (part.kind === 'attr') {
        if (value === false || value === null || value === undefined) part.el.removeAttribute(part.name);
        else part.el.setAttribute(part.name, value === true ? '' : String(value));
      } else if (part.kind === 'prop') {
        (part.el as unknown as Record<string, unknown>)[part.name] = value;
      } else if (part.kind === 'event') {
        if (part.handler) part.el.removeEventListener(part.name, part.handler);
        part.el.addEventListener(part.name, value as EventListener);
        part.handler = value as EventListener;
      }
    }
    previous.values = template.values;
    return;
  }
  container.innerHTML = '';
  const { fragment, attrBindings } = buildFragment(template.strings);
  container.appendChild(fragment);
  const parts = resolveParts(container, template.values.length);
  bindInitial(container, parts, attrBindings, template.values);
  instances.set(container, { strings: template.strings, values: template.values, parts });
}

export default function App() {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const items = ['alpha', 'beta', 'gamma'];

  useEffect(() => {
    if (!ref.current) return;
    render(
      html`<div>
        <p>Count: ${count}</p>
        <button @click="${() => setCount((c) => c + 1)}">+1</button>
        <ul>
          ${items.map((item) => html`<li>${item}</li>`)}
        </ul>
      </div>`,
      ref.current,
    );
  });

  return <div ref={ref} />;
}
