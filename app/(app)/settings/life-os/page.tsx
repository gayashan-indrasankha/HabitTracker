import { requireUser } from '@/lib/auth/session';
import { LifeOsSetup } from '@/components/life/life-os-setup';

export const metadata = { title: 'Life OS Setup | HabitFlow' };

export default async function LifeOsSetupPage() {
  await requireUser();
  return <LifeOsSetup />;
}
