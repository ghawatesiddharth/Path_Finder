import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { ChatPanel } from '@/components/ChatPanel';
import type { Route } from '@/types';

export function AppShell({ children, route }: { children: React.ReactNode; route: Route }) {
  return (
    <div className="flex h-screen overflow-hidden bg-ink-50 dark:bg-ink-900">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div key={route} className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Floating chat: movable, resizable, minimizable — always mounted so
          drag position and size persist across route changes. */}
      <ChatPanel />
    </div>
  );
}
