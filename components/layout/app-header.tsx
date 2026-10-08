'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/client';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';
import Link from 'next/link';

interface AppHeaderProps {
  user: { name?: string | null; email: string };
  settings: { theme: string };
}

export function AppHeader({ user, settings }: AppHeaderProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(false);
    try {
      const result = await signOut();
      if (result.error) {
        setSignOutError(true);
        return;
      }
      router.replace('/login');
      router.refresh();
    } catch {
      setSignOutError(true);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-sm md:px-6 lg:px-8">
      <div className="min-w-0">
        <Link href="/dashboard" className="text-sm font-black uppercase tracking-[.12em] lg:hidden">
          Habit<span className="text-primary">Flow</span>
        </Link>
        {signOutError && (
          <p role="alert" className="text-xs text-destructive sm:text-sm">
            Could not sign out. Try again.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle savedTheme={settings.theme} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-10 min-w-0 gap-2"
              aria-label={`Account menu for ${user.name ?? user.email}`}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase text-primary-foreground">
                {(user.name ?? user.email)[0]}
              </div>
              <span className="hidden max-w-40 truncate text-sm md:block">
                {user.name ?? 'Account'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
              <p className="max-w-64 break-words text-sm font-medium">{user.name ?? 'Account'}</p>
              <p className="max-w-64 break-all text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <User className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
