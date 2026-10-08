'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Settings,
  CalendarDays,
  Target,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navigation = [
  { name: 'Today', href: '/today', icon: LayoutDashboard },
  { name: 'Week', href: '/week', icon: CalendarDays },
  { name: 'Habits', href: '/habits', icon: ListChecks },
  { name: 'Goals & Projects', href: '/goals', icon: Target },
  { name: 'Review & Insights', href: '/review', icon: ClipboardCheck },
  { name: 'Month history', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Notes', href: '/notes', icon: NotebookPen },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return <nav aria-label="Mobile navigation" className="sticky top-16 z-30 flex gap-1 overflow-x-auto border-b bg-card p-2 lg:hidden">
    {navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}
      className={cn('flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary', pathname === item.href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}><item.icon className="h-4 w-4" aria-hidden="true"/>{item.name}</Link>)}
  </nav>;
}

interface AppSidebarProps {
  user: { name?: string | null; email: string; image?: string | null };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-card lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-black italic text-primary-foreground">HF</span>
        <span className="text-base font-black uppercase tracking-[.12em]">Habit<span className="text-primary">Flow</span></span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase text-primary-foreground"
            aria-hidden
          >
            {(user.name ?? user.email)[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name ?? 'User'}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
