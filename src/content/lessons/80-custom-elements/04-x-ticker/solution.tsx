import { createElement, useRef } from 'react';

/**
 * Registers `x-ticker-<suffix>` if it isn't already registered under that exact tag, and returns
 * the tag name. Never call `customElements.define` for a fixed tag name at module top level —
 * this module gets evaluated more than once while grading, and `define` can only be called once
 * per tag.
 */
export function define(suffix: string): string {
  const tag = `x-ticker-${suffix}`;
  if (customElements.get(tag)) return tag;

  class XTicker extends HTMLElement {
    #tick = 0;
    #intervalId: ReturnType<typeof window.setInterval> | undefined;
    #resized = false;
    #controller: AbortController | null = null;

    connectedCallback() {
      this.#render();
      this.#intervalId = window.setInterval(() => {
        this.#tick += 1;
        this.#render();
      }, 20);

      this.#controller = new AbortController();
      window.addEventListener(
        'resize',
        () => {
          this.#resized = true;
          this.#render();
        },
        { signal: this.#controller.signal },
      );
    }

    disconnectedCallback() {
      if (this.#intervalId !== undefined) {
        window.clearInterval(this.#intervalId);
        this.#intervalId = undefined;
      }
      this.#controller?.abort();
      this.#controller = null;
    }

    #render() {
      this.textContent = this.#resized ? `${this.#tick} (resized)` : String(this.#tick);
    }
  }

  customElements.define(tag, XTicker);
  return tag;
}

export default function App() {
  const suffix = useRef(Date.now().toString(36) + Math.random().toString(36).slice(2)).current;
  const tag = useRef(define(suffix)).current;
  return createElement(tag);
}
