import { requireUser } from '@/lib/auth/session';
import { getUserSettings } from '@/lib/dal/user-settings';
import { AppSidebar, MobileNav } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <AppHeader user={user} settings={settings} />
        <MobileNav />
        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
