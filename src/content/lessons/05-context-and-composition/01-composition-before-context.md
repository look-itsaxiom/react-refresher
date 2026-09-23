# Composition before context

Most "prop drilling is painful" stories are actually composition problems wearing a context-shaped costume. Before reaching for `createContext`, reach for the tool React was built around: components that take other components as data.

## The problem context gets blamed for

```tsx
function Page({ user, theme }: { user: User; theme: Theme }) {
  return <Layout user={user} theme={theme} />;
}
function Layout({ user, theme }: { user: User; theme: Theme }) {
  return <Sidebar user={user} theme={theme} />;
}
function Sidebar({ user, theme }: { user: User; theme: Theme }) {
  return <Profile user={user} theme={theme} />;
}
function Profile({ user, theme }: { user: User; theme: Theme }) {
  return <div className={theme}>{user.name}</div>;
}
```

`Layout` and `Sidebar` don't care about `user` or `theme`. They only exist to hand the props to whoever is next. That's prop drilling, and it's annoying, but the annoyance is a symptom: `Layout` and `Sidebar` are too specific about what they contain. They hard-code "a `Sidebar` always has a `Profile`", so every prop `Profile` needs has to tunnel through both.

## Children as data

JSX children are just a prop. `<Layout><Sidebar /></Layout>` is `Layout({ children: <Sidebar /> })`. Once you treat `children` (or any prop that holds a component) as data instead of a fixed slot, the tunnel disappears:

```tsx
function Layout({ children }: { children: React.ReactNode }) {
  return <div className="layout">{children}</div>;
}
function Sidebar({ children }: { children: React.ReactNode }) {
  return <aside>{children}</aside>;
}

function Page({ user, theme }: { user: User; theme: Theme }) {
  return (
    <Layout>
      <Sidebar>
        <Profile user={user} theme={theme} />
      </Sidebar>
    </Layout>
  );
}
```

`Profile` gets its props directly from whoever assembles the tree. `Layout` and `Sidebar` never see `user` or `theme` at all, because they no longer need to. This is the same trick behind "lifting state up": you don't lift state to a component, you lift the *assembly* of the tree to wherever the data already lives, and pass the finished pieces down as `children` or named slot props (`<SplitPane left={<Editor />} right={<Preview />} />`).

This also sidesteps a performance trap. When `Page` re-renders because `theme` changed, `<Sidebar>{children}</Sidebar>` written inline still creates a new element each render — but if the `children` element itself was constructed higher up, outside anything that depends on the changing state, React can bail out of re-rendering the parts of the tree that never received new props. Composition isn't just about typing fewer props; it changes *what has to re-render* when something changes.

## Compound components

The same idea scales into components that share implicit state with each other but not with the outside world. `<select><option /></select>` is the platform's own compound component: `option` doesn't work standalone, but you never pass the selected value to each `option` by hand. A `Tabs` built the same way looks like:

```tsx
<Tabs defaultValue="profile">
  <Tabs.List>
    <Tabs.Tab value="profile">Profile</Tabs.Tab>
    <Tabs.Tab value="settings">Settings</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="profile">...</Tabs.Panel>
  <Tabs.Panel value="settings">...</Tabs.Panel>
</Tabs>
```

The caller never threads `activeValue` or `setActiveValue` through `Tabs.List` to reach `Tabs.Tab`. `Tabs.Tab` and `Tabs.Panel` need to agree on "which value is active" without the parent (`Tabs.List`) knowing or caring — and unlike the `Layout`/`Sidebar` example, that shared value *does* change over time and *is* needed by components at arbitrary depth inside the compound component, not just passed straight through. That's the one case composition alone doesn't solve, and it's exactly the gap context fills. You'll build this exact component in the next exercise, after seeing how React 19 does context.

## When composition stops being enough

Reach for context when the value needs to reach components at *unknown, varying depth* — not a fixed three levels you could flatten with `children` — and especially when unrelated components (not nested inside each other, just co-located in the same subtree) need to agree on the same piece of state without a shared parent explicitly wiring them together. Theming, the current authenticated user, and a compound component's shared selection are the recurring examples. A prop that only ever travels two or three levels to a component whose slot you control is a composition problem; solve it with `children` first.

## Further reading (optional)

- [Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component) — react.dev
- [Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) — react.dev, see the "Before you use context" section
- [You Might Not Need an Effect: passing data down](https://react.dev/learn/you-might-not-need-an-effect) — react.dev
