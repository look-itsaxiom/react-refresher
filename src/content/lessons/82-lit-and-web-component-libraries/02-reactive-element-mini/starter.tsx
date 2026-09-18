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

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const props = (this.constructor as typeof ReactiveElement).properties;
    for (const name of Object.keys(props)) {
      const opts = props[name];
      Object.defineProperty(this, name, {
        configurable: true,
        enumerable: true,
        get: () => this.values.get(name),
        set: (value: unknown) => {
          // BUG: no Object.is check (re-renders even for an unchanged value), no batching
          // (each set renders immediately), and `reflect` is never written to the attribute.
          this.values.set(name, value);
          this.performUpdate();
        },
      });
    }
  }

  connectedCallback(): void {
    this.performUpdate();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    const opts = (this.constructor as typeof ReactiveElement).properties[name];
    if (!opts) return;
    (this as Record<string, unknown>)[name] = convertFromAttribute(value, opts.type);
  }

  // BUG: always resolved already, so `await el.updateComplete` never waits for anything.
  updateComplete: Promise<void> = Promise.resolve();

  updated(_changed: Map<string, unknown>): void {}

  abstract render(): string;

  private performUpdate(): void {
    this.shadowRoot!.innerHTML = this.render();
    // BUG: should be the map of properties that changed in this batch, with their old values.
    this.updated(new Map());
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
