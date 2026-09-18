`Tabs.Tab` and `Tabs.Panel` both need "the active value" and `Tabs.Tab` also needs a way to change it, but `Tabs.List` sits between `Tabs` and `Tabs.Tab` and shouldn't need to know either exists. That's the context shape: create it once, above all four components.
---
`const TabsContext = createContext<{ activeValue: string; setActiveValue: (v: string) => void } | null>(null)`. `Tabs` provides it with `<TabsContext value={{ activeValue, setActiveValue }}>`; `Tabs.Tab` and `Tabs.Panel` read it with `use(TabsContext)`.
---
`Tabs.Tab`'s `aria-selected` and `Tabs.Panel`'s decision to render both come down to the same comparison: `activeValue === value`. `Tabs.Tab`'s `onClick` should call `setActiveValue(value)` from context, not a prop.
---
Nothing about `Tabs.List` needs to change at all — it only ever rendered `children`, and that was never the problem.
