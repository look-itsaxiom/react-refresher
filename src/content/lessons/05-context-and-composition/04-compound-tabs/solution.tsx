import { createContext, use, useMemo, useState, type ReactNode } from 'react';

type TabsContextValue = { activeValue: string; setActiveValue: (value: string) => void };

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = use(TabsContext);
  if (!ctx) throw new Error('Tabs.Tab / Tabs.Panel must be used inside <Tabs>');
  return ctx;
}

function Tabs({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  const [activeValue, setActiveValue] = useState(defaultValue);
  const value = useMemo(() => ({ activeValue, setActiveValue }), [activeValue]);
  return (
    <TabsContext value={value}>
      <div data-testid="tabs">{children}</div>
    </TabsContext>
  );
}

function TabsList({ children }: { children: ReactNode }) {
  return (
    <div role="tablist" data-testid="tabs-list">
      {children}
    </div>
  );
}

function TabsTab({ value, children }: { value: string; children: ReactNode }) {
  const { activeValue, setActiveValue } = useTabsContext();
  const isActive = activeValue === value;
  return (
    <button role="tab" aria-selected={isActive} onClick={() => setActiveValue(value)}>
      {children}
    </button>
  );
}

function TabsPanel({ value, children }: { value: string; children: ReactNode }) {
  const { activeValue } = useTabsContext();
  if (activeValue !== value) return null;
  return <div role="tabpanel">{children}</div>;
}

Tabs.List = TabsList;
Tabs.Tab = TabsTab;
Tabs.Panel = TabsPanel;

export default function App() {
  return (
    <Tabs defaultValue="profile">
      <Tabs.List>
        <Tabs.Tab value="profile">Profile</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="profile">Profile content</Tabs.Panel>
      <Tabs.Panel value="settings">Settings content</Tabs.Panel>
    </Tabs>
  );
}
