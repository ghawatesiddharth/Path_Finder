import { LayoutDashboard, BookOpen, Route as RouteIcon, User, ClipboardList, ChevronLeft, Compass, Target } from 'lucide-react';
import { useApp } from '@/store';
import type { Route } from '@/types';

const nav: { id: Route; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'courses', label: 'My Courses', icon: BookOpen },
  { id: 'path', label: 'Learning Path', icon: RouteIcon },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'assessment', label: 'Assessment', icon: ClipboardList },
];

export function Sidebar() {
  const { route, setRoute, sidebarCollapsed, toggleSidebar, user, paths, taskCompletion } = useApp();
  const collapsed = sidebarCollapsed;

  const activePath = paths.find((p) => p.active);
  const totalTasks = activePath?.stages.reduce((sum, s) => sum + (s.tasks?.length ?? 0), 0) ?? 0;
  const doneTasks = activePath?.stages.reduce(
    (sum, s) => sum + (s.tasks?.filter((t) => taskCompletion[t.id]).length ?? 0), 0,
  ) ?? 0;
  const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-ink-100 bg-white transition-all duration-300 dark:border-ink-700 dark:bg-ink-800 ${
        collapsed ? 'w-[68px]' : 'w-[220px]'
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-ink-900">
          <Compass size={20} strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-display text-lg font-bold leading-none text-ink-800 dark:text-ink-50">
              PathFinder
            </div>
            <div className="mt-0.5 text-2xs text-ink-400">Learning Guide</div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-ink-100 bg-white text-ink-400 shadow-soft transition-all hover:text-amber-400 dark:border-ink-700 dark:bg-ink-700"
      >
        <ChevronLeft size={14} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Nav */}
      <nav className="mt-4 flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active = route === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setRoute(item.id)}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'text-ink-800 dark:text-ink-50'
                  : 'text-ink-400 hover:bg-ink-50 hover:text-ink-700 dark:hover:bg-ink-700 dark:hover:text-ink-100'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-amber-400" />
              )}
              <Icon size={20} strokeWidth={active ? 2.4 : 2} className={active ? 'text-amber-500' : ''} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User + progress */}
      <div className="border-t border-ink-100 p-3 dark:border-ink-700">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-iris-500 text-sm font-semibold text-white">
            {user.avatarInitials}
            {activePath && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-sage-400 dark:border-ink-800" />}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink-800 dark:text-ink-50">{user.name}</div>
              {activePath ? (
                <div className="flex items-center gap-1 text-2xs text-ink-400">
                  <Target size={11} className="text-amber-400" />
                  {pct}% through path
                </div>
              ) : (
                <div className="text-2xs text-ink-300">No active path</div>
              )}
            </div>
          )}
        </div>
        {collapsed && activePath && (
          <div className="mt-2 flex justify-center">
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-2xs font-semibold text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
              <Target size={10} />
              {pct}%
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
