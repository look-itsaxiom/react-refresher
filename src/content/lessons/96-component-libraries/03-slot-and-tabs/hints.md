Start with `useControllableState`. `isControlled = value !== undefined`. The returned
setter should call `onChange` unconditionally, but only call the internal `setState` when
`!isControlled` — that's the entire controlled/uncontrolled contract.

---

For `Slot`'s prop merge, loop over the *slot's* own prop keys (not the child's) and decide
per key: if it's `className`, concatenate; if it's `style`, spread-merge; if it's a
function whose key starts with `on` (an event handler) and the child also has a function
there, wrap both in a new function that calls the child's first, then the slot's; for
everything else, let `{ ...slotProps, ...childProps }` naturally give the child's value
priority since it's spread second.

---

For ref merging, write a small `composeRefs(...refs)` helper that returns one callback
ref. Inside it, call each incoming ref with the node (function refs get called directly;
object refs get `.current` set) and collect whatever each call returns. Return a cleanup
function from the callback ref that calls each collected cleanup if it's a function,
otherwise re-invokes the same ref-setting logic with `null`.

---

`Tabs.Root` just needs one `useControllableState` call for the active value, a `useId()`
for generating stable trigger/content ids from `${baseId}-trigger-${value}` and
`${baseId}-content-${value}`, and a context provider. Put `orientation` in the context too
— `Tabs.List` needs it to pick which arrow keys move focus.

---

`Tabs.List`'s keyboard handler doesn't need a registry of trigger refs — give the list a
`ref` on its own container, and on `keydown` call
`container.querySelectorAll('[role="tab"]')` to get the current tabs in DOM order. Find
the focused one's index with `Array.from(tabs).indexOf(document.activeElement)`, compute
the next index with wraparound (`(index + 1) % tabs.length`, and
`(index - 1 + tabs.length) % tabs.length` for the previous one), then `.focus()` that tab
and read its `data-*` value attribute to also call the context's `setValue` — that's what
makes arrow-key movement "activate" instead of just move focus.

---

Full shape for reference — fill in the bodies:

```tsx
function Slot({ children, ref, ...slotProps }: SlotProps) {
  if (!isValidElement(children)) return null;
  const { ref: childRef, ...childProps } = children.props as Record<string, unknown> & { ref?: React.Ref<unknown> };
  const merged = mergeSlotProps(slotProps, childProps);
  return cloneElement(children, { ...merged, ref: composeRefs(ref, childRef) });
}

const TabsContext = createContext<TabsContextValue | null>(null);

function Trigger({ value, asChild, children, ...rest }: TriggerProps) {
  const { value: activeValue, setValue, baseId } = useTabsContext('Tabs.Trigger');
  const isActive = activeValue === value;
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      role="tab"
      id={`${baseId}-trigger-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-content-${value}`}
      data-state={isActive ? 'active' : 'inactive'}
      data-tab-value={value}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setValue(value)}
      {...rest}
    >
      {children}
    </Comp>
  );
}
```
