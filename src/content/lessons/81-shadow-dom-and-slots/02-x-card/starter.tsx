import { useEffect, useRef } from 'react';

/**
 * Registers `x-card-<suffix>` (a no-op if it's already registered) and returns the tag name.
 * Every check calls this with its own unique suffix so re-registration never collides.
 */
export function define(suffix: string): string {
  const tag = `x-card-${suffix}`;
  if (!customElements.get(tag)) {
    customElements.define(
      tag,
      class extends HTMLElement {
        constructor() {
          super();
          const root = this.attachShadow({ mode: 'open' });
          // TODO: build the shadow tree.
          // - a <style> with a :host rule, a ::slotted(...) rule, and a var(--x-card-accent, ...)
          // - a part="container" wrapper
          // - a named "title" slot, a default slot, and a named "footer" slot with fallback content
          root.innerHTML = `<slot></slot>`;
        }

        // TODO: replace with a getter that reads the title slot's assignedNodes().
        get titleText(): string {
          return '';
        }

        // TODO: listen for slotchange on the footer slot and reflect it onto
        // this.dataset.hasFooter ("true" / "false").
      },
    );
  }
  return tag;
}

// Picked once per module evaluation so the preview never collides with itself.
const previewTag = define(`preview-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

function Preview() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const el = document.createElement(previewTag);

    const title = document.createElement('span');
    title.slot = 'title';
    title.textContent = 'Q3 report';

    const body = document.createElement('p');
    body.textContent = 'Revenue is up 12% quarter over quarter.';

    const footer = document.createElement('span');
    footer.slot = 'footer';
    footer.textContent = 'Reviewed by Ada';

    el.append(title, body, footer);
    host.appendChild(el);

    return () => {
      host.replaceChildren();
    };
  }, []);

  return <div ref={ref} />;
}

export default function App() {
  return <Preview />;
}
