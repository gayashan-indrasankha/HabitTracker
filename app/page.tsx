import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  redirect('/login');
}
