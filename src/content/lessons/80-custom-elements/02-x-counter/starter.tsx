import { createElement, useRef } from 'react';

/**
 * Registers `x-counter-<suffix>` if it isn't already registered under that exact tag, and
 * returns the tag name. Never call `customElements.define` for a fixed tag name at module top
 * level — this module gets evaluated more than once while grading, and `define` can only be
 * called once per tag.
 */
export function define(suffix: string): string {
  const tag = `x-counter-${suffix}`;
  if (customElements.get(tag)) return tag;

  class XCounter extends HTMLElement {
    static get observedAttributes() {
      return ['value', 'step', 'min', 'max', 'disabled'];
    }

    #dec: HTMLButtonElement | null = null;
    #out: HTMLOutputElement | null = null;
    #inc: HTMLButtonElement | null = null;

    connectedCallback() {
      if (!this.#out) {
        this.#dec = document.createElement('button');
        this.#dec.type = 'button';
        this.#dec.textContent = '−';
        this.#out = document.createElement('output');
        this.#inc = document.createElement('button');
        this.#inc.type = 'button';
        this.#inc.textContent = '+';
        this.append(this.#dec, this.#out, this.#inc);

        this.#dec.addEventListener('click', () => this.#step(-1));
        this.#inc.addEventListener('click', () => this.#step(1));
      }
      this.#render();
    }

    attributeChangedCallback() {
      this.#render();
    }

    get value(): number {
      return Number(this.getAttribute('value') ?? '0');
    }

    set value(next: number) {
      // TODO: clamp `next` between the `min`/`max` attributes before writing it.
      this.setAttribute('value', String(next));
    }

    #step(direction: 1 | -1) {
      // TODO: use the `step` attribute for the delta (default 1 if absent), clamp the result
      // between `min`/`max`, and dispatch an `x-change` CustomEvent (bubbles: true,
      // composed: true, detail: { value }) with the new value — only from here, never from the
      // `value` property setter.
      this.value = this.value + direction;
    }

    #render() {
      if (!this.#out || !this.#dec || !this.#inc) return;
      this.#out.textContent = String(this.value);
      const isDisabled = this.hasAttribute('disabled');
      this.#dec.disabled = isDisabled;
      this.#inc.disabled = isDisabled;
    }
  }

  customElements.define(tag, XCounter);
  return tag;
}

export default function App() {
  const suffix = useRef(Date.now().toString(36) + Math.random().toString(36).slice(2)).current;
  const tag = useRef(define(suffix)).current;
  return createElement(tag, { value: '4', min: '0', max: '10', step: '2' });
}
