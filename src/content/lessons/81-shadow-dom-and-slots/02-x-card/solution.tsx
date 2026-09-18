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
          root.innerHTML = `
            <style>
              :host {
                display: block;
                border: 1px solid #d0d0d0;
                border-radius: 0.75rem;
                padding: 1rem 1.25rem;
                font-family: inherit;
              }
              :host([data-has-footer="false"]) [part="footer"] {
                opacity: 0.6;
                font-style: italic;
              }
              ::slotted(*) {
                margin: 0 0 0.5rem;
              }
              [part="title"] {
                color: var(--x-card-accent, #1a1a1a);
                font-weight: 600;
              }
            </style>
            <div part="container">
              <header part="title"><slot name="title">Untitled</slot></header>
              <div part="body"><slot></slot></div>
              <footer part="footer"><slot name="footer">No notes yet.</slot></footer>
            </div>
          `;

          const footerSlot = root.querySelector('slot[name="footer"]') as HTMLSlotElement;
          footerSlot.addEventListener('slotchange', () => {
            this.dataset.hasFooter = String(footerSlot.assignedNodes().length > 0);
          });
        }

        connectedCallback() {
          // A custom element constructor must not set attributes on itself (the spec
          // requires the element to have no attributes right after construction), so the
          // initial value is set here instead, once the element is actually in the tree.
          if (this.dataset.hasFooter === undefined) {
            this.dataset.hasFooter = 'false';
          }
        }

        get titleText(): string {
          const slot = this.shadowRoot!.querySelector('slot[name="title"]') as HTMLSlotElement;
          return slot
            .assignedNodes()
            .map((node) => node.textContent ?? '')
            .join('')
            .trim();
        }
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
