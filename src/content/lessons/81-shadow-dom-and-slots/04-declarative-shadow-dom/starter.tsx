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
  // TODO: build and return the DSD HTML string.
  return `<${tag}></${tag}>`;
}

/**
 * Finds every unhydrated `<template shadowrootmode="...">` inside `container`, attaches a
 * real shadow root to its parent host, moves the template's content in, and removes the
 * template. Returns the number of shadow roots created. Calling it again with nothing left
 * to hydrate must return 0 and do nothing.
 */
export function hydrateDeclarativeShadow(container: ParentNode): number {
  // TODO: implement.
  return 0;
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
