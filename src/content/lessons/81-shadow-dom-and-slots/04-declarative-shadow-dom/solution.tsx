import { useEffect, useRef } from 'react';

/**
 * Returns the HTML string a server would emit for declarative Shadow DOM:
 * <TAG><template shadowrootmode="MODE">SHADOW_HTML</template>LIGHT_HTML</TAG>
 */
export function renderDeclarativeShadow(
  tag: string,
  shadowHTML: string,
  lightHTML: string,
  options?: { mode?: 'open' | 'closed' },
): string {
  const mode = options?.mode ?? 'open';
  return `<${tag}><template shadowrootmode="${mode}">${shadowHTML}</template>${lightHTML}</${tag}>`;
}

/**
 * Finds every unhydrated `<template shadowrootmode="...">` inside `container`, attaches a
 * real shadow root to its parent host, moves the template's content in, and removes the
 * template. Returns the number of shadow roots created. Calling it again with nothing left
 * to hydrate must return 0 and do nothing.
 */
export function hydrateDeclarativeShadow(container: ParentNode): number {
  const templates = Array.from(
    container.querySelectorAll('template[shadowrootmode]'),
  ) as HTMLTemplateElement[];

  let created = 0;
  for (const template of templates) {
    const host = template.parentElement;
    if (!host) continue;
    const mode = template.getAttribute('shadowrootmode') === 'closed' ? 'closed' : 'open';
    const root = host.attachShadow({ mode });
    root.appendChild(template.content.cloneNode(true));
    template.remove();
    created += 1;
  }
  return created;
}

function Preview() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = renderDeclarativeShadow(
      'div',
      '<style>:host { display: block; border: 1px dashed #999; padding: 0.5rem; }</style><em>shadow says: </em><slot></slot>',
      'hello from the light DOM',
    );
    const created = hydrateDeclarativeShadow(host);
    console.log(`hydrated ${created} shadow root(s)`);
  }, []);

  return <div ref={ref} />;
}

export default function App() {
  return <Preview />;
}
