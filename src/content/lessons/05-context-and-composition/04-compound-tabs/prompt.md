Finish the compound `Tabs` component. The pieces are wired to each other through props right now, which is exactly the prop drilling this lesson is about — `Tabs.List` has to accept and forward `activeValue`/`onSelect` to every `Tabs.Tab`, even though `Tabs.List` itself never uses them.

Replace that with context:

1. Create a `TabsContext` that carries the active value and a setter.
2. `Tabs` should own the active-tab state (`useState`, initialized from the `defaultValue` prop) and provide it through `TabsContext`. It should no longer pass `activeValue`/`onSelect` to its children as props.
3. `Tabs.List` should render its children as-is — no props to forward.
4. `Tabs.Tab` should read the active value from context, render a `<button role="tab">` with `aria-selected` set correctly, and call the context setter on click.
5. `Tabs.Panel` should read the active value from context and render its children only when its own `value` matches.

The public API (`<Tabs defaultValue="..."><Tabs.List>...` etc.) should not change — only how the pieces talk to each other internally.
