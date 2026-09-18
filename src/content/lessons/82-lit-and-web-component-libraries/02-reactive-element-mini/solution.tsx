import { useState, type ElementType } from 'react';

export type PropertyType = typeof String | typeof Number | typeof Boolean;
export type PropertyOptions = { type?: PropertyType; reflect?: boolean };
export type PropertyDeclarations = Record<string, PropertyOptions>;

function convertFromAttribute(value: string | null, type: PropertyType | undefined): unknown {
  if (type === Boolean) return value !== null;
  if (value === null) return undefined;
  if (type === Number) return Number(value);
  return value;
}

export abstract class ReactiveElement extends HTMLElement {
  static properties: PropertyDeclarations = {};

  static get observedAttributes(): string[] {
    return Object.keys(this.properties);
  }

  private values = new Map<string, unknown>();
  private changed = new Map<string, unknown>();
  private pending = false;
  private reflecting = false;
  private resolveUpdate: (() => void) | null = null;
  updateComplete: Promise<void>;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.updateComplete = new Promise((resolve) => {
      this.resolveUpdate = resolve;
    });
    const props = (this.constructor as typeof ReactiveElement).properties;
    for (const name of Object.keys(props)) {
      const opts = props[name] ?? {};
      Object.defineProperty(this, name, {
        configurable: true,
        enumerable: true,
        get: () => this.values.get(name),
        set: (value: unknown) => {
          const old = this.values.get(name);
          if (Object.is(old, value)) return;
          this.values.set(name, value);
          if (opts.reflect) this.reflectToAttribute(name, value, opts);
          this.requestUpdate(name, old);
        },
      });
    }
  }

  connectedCallback(): void {
    this.requestUpdate();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (this.reflecting) return; // this write came from our own reflectToAttribute — don't loop
    const opts = (this.constructor as typeof ReactiveElement).properties[name];
    if (!opts) return;
    (this as Record<string, unknown>)[name] = convertFromAttribute(value, opts.type);
  }

  updated(_changed: Map<string, unknown>): void {}

  abstract render(): string;

  private reflectToAttribute(name: string, value: unknown, opts: PropertyOptions): void {
    this.reflecting = true;
    try {
      if (opts.type === Boolean) {
        if (value) this.setAttribute(name, '');
        else this.removeAttribute(name);
      } else if (value === undefined || value === null) {
        this.removeAttribute(name);
      } else {
        this.setAttribute(name, String(value));
      }
    } finally {
      this.reflecting = false;
    }
  }

  private requestUpdate(name?: string, oldValue?: unknown): void {
    if (name !== undefined) this.changed.set(name, oldValue);
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      const changed = this.changed;
      this.changed = new Map();
      this.shadowRoot!.innerHTML = this.render();
      this.updated(changed);
      const resolve = this.resolveUpdate!;
      this.updateComplete = new Promise((res) => {
        this.resolveUpdate = res;
      });
      resolve();
    });
  }
}

export function define(suffix: string): string {
  const tag = `x-greeting-${suffix}`;
  if (customElements.get(tag)) return tag;

  class Greeting extends ReactiveElement {
    static properties: PropertyDeclarations = {
      name: { type: String, reflect: true },
      count: { type: Number },
    };

    declare name: string;
    declare count: number;

    render(): string {
      const name = this.name ?? 'World';
      const count = this.count ?? 0;
      return `<p>Hello, ${name}! (${count})</p>`;
    }
  }

  customElements.define(tag, Greeting);
  return tag;
}

export default function App() {
  const [tag] = useState(() => define(Math.random().toString(36).slice(2)));
  const [count, setCount] = useState(0);
  const Tag = tag as unknown as ElementType;
  return (
    <div>
      <Tag name="Ada" count={count} />
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}
