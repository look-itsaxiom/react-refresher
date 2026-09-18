# The ecosystem and the design-system question

Lit isn't the only way to ship web components, and web components aren't the only reason to reach for a compiler like it. This section is a map of who's using what, and — the actual decision you'll face — when a design system should ship as web components instead of React components.

## The major libraries, and how they differ

- **Lit** (Google-maintained, MIT). Runtime library: you write classes that extend `LitElement`, ship Lit itself as a dependency (small, but not zero). The default choice for a from-scratch design system today; most of the names below are either built on it or converging toward its template model.
- **Stencil** (Ionic). A *compiler*, not a runtime: you write components in a JSX-and-decorators dialect that looks like a cross between Lit and React, and Stencil compiles each one to a standalone, dependency-free custom element with its own lazy-loaded bundle. Ionic Framework itself is built on Stencil. The pitch is zero-runtime-cost consumption — a page using three Stencil components loads three small element bundles, not "three components plus a shared framework" — at the cost of a build step consumers of Lit don't need.
- **Spectrum Web Components** (Adobe). Adobe's design system, built on Lit, used inside Adobe's own web apps (including parts of the Photoshop and Express web clients) alongside a parallel React implementation (React Spectrum) for teams that want the same design language without leaving JSX.
- **Shoelace → Web Awesome**. Shoelace was a popular, framework-agnostic, MIT-licensed Lit-based component library. Font Awesome acquired the project and its creator, and has been migrating it into a commercial/open successor called Web Awesome — treat "Shoelace" as the legacy name and check the project's current site for where new development is actually landing before starting a new project on it.
- **Material Web** (`@material/web`, Google). Google's web-component implementation of Material Design 3. It saw real investment through 2023–2024 but Google's own guidance shifted toward framework-specific implementations (Angular Material, Flutter, Jetpack Compose) rather than treating the cross-framework web-component package as the primary Material 3 deliverable — confirm current status before depending on it for new work.
- **Carbon Web Components** (IBM). The framework-agnostic layer of IBM's Carbon Design System, built on Lit, alongside carbon-react and carbon-angular that consume the same design tokens.
- **Vaadin**. A full Java-backend-oriented framework whose client side is a set of Lit-based web components; also usable standalone from any frontend.
- **FAST / Fluent UI Web Components** (Microsoft). Microsoft's web-component effort for Fluent Design. Microsoft has been narrowing investment here in favor of React-first Fluent UI — check the project's current maintenance status before adopting FAST specifically for new work.

The pattern across almost all of these: pick a design system, and you're very likely also picking Lit as a transitive dependency, or Stencil as a build tool. Framework-native alternatives (MUI, Chakra, Ant Design, Angular Material) remain the more common default *inside* a single-framework app; the web-component systems above exist specifically for the "our product isn't one framework" case.

## The interop story

[Custom Elements Everywhere](https://custom-elements-everywhere.com/) is the reference compatibility matrix: it runs the same custom element against React, Vue, Angular, Svelte, and others, and scores each framework on property vs. attribute passing and custom event listening. React was the visible outlier for years — pre-19, React only ever set custom-element *attributes*, never properties, and had no first-class way to listen for a custom event (`onFoo` doesn't map to a `foo` CustomEvent). That's exactly what changed in React 19, covered in full in the next lesson: React 19 sets properties when the element defines a matching class field, so `.disabled={value}` and `.data={someObject}` now flow inline the way they would in Lit itself, closing most of the gap this section describes.

Two escape hatches exist regardless of framework version: `@lit/react`'s `createComponent()` wraps any custom element in a thin React component that manually forwards properties and re-emits custom events as `onEventName` props, useful today and a smaller diff even after React 19; and Stencil's output targets include a generated framework-specific wrapper package (`@my-lib/react`, `@my-lib/angular`) that does the same thing at build time instead of runtime.

## Styling and a11y across the boundary

Shadow DOM's encapsulation (lesson 81) is also styling's biggest interop cost: a consumer's global CSS can't reach into a component's shadow root except through the seams the component author explicitly opens — `::part()` for specific internal elements the author marks with a `part` attribute, and CSS custom properties, which *do* cross shadow boundaries by design and are how every library above exposes theming (`--sl-color-primary`, `--cds-*` tokens, etc.). A design system decides its styling API by choosing what to expose via `part` and which custom properties to define; there's no equivalent of "just override the class" the way there is with a plain React component and CSS-in-JS or Tailwind.

Accessibility maturity varies more by library age and team investment than by "web components vs. framework components" as a category — Shadow DOM does not break ARIA relationships that use IDs *within* the same shadow tree, but an `aria-labelledby` that needs to reach across a shadow boundary does not work, which shapes how these libraries structure composite widgets (comboboxes, tab panels) internally. Adobe Spectrum and Carbon both publish accessibility conformance reports; that's worth checking per-library rather than assuming.

## When not to reach for web components

Skip them for a heavy React-only application with no plan to ever ship the same UI outside React: you'd be paying Shadow DOM's styling isolation cost and losing React's synthetic event system and context propagation into the component, for zero portability benefit. Skip them, or at least delay them, for an SSR-first product on a framework whose declarative-Shadow-DOM support is still catching up — check your framework's current status rather than assuming; hydration ordering with real Shadow DOM content is a solved but still-maturing corner of several meta-frameworks. And skip a whole new *dependency* (Lit, Stencil) if the actual goal is just "isolate this one third-party embed" — lesson 80's plain `customElements.define` is enough for that, and adding Lit only pays off once you're maintaining enough elements that the reactive-property boilerplate it removes outweighs its bundle cost. The case *for* web components is almost always portability: a design system consumed by more than one framework, or a single component embedded in pages you don't control the framework of at all.

## Further reading

- [Custom Elements Everywhere](https://custom-elements-everywhere.com/)
- [Stencil docs: Introduction](https://stenciljs.com/docs/introduction)
- [Lit docs: Using Lit with React (`@lit/react`)](https://lit.dev/docs/frameworks/react/)
- [web.dev: Styling web components](https://web.dev/articles/styling-web-components)
