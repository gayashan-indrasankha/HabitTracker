import Link from 'next/link';
import { Activity, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SignInForm } from '@/components/auth/sign-in-form';
import { safeNextPath } from '@/lib/auth/redirect';

export const metadata = { title: 'Log in | HabitFlow' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const nextPath = safeNextPath((await searchParams).next);

  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-xl lg:grid-cols-2">
      <aside className="hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Activity aria-hidden="true" /> HabitFlow
        </div>
        <div className="space-y-6">
          <p className="text-4xl font-semibold leading-tight">Build a rhythm you can keep.</p>
          <p className="text-primary-foreground/80">
            A calm space to see your progress, one day at a time.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5" /> Your habits, your pace.
          </div>
        </div>
        <p className="text-sm text-primary-foreground/70">Small actions add up.</p>
      </aside>
      <div className="px-6 py-9 sm:px-10 sm:py-12">
        <Link href="/" className="mb-10 flex items-center gap-2 text-lg font-semibold lg:hidden">
          <Activity aria-hidden="true" className="text-primary" /> HabitFlow
        </Link>
        <div className="mb-7 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Welcome back
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Log in to HabitFlow</h1>
          <p className="text-sm text-muted-foreground">Continue where you left off.</p>
        </div>
        <SignInForm nextPath={nextPath} />
        <p className="mt-7 text-center text-sm text-muted-foreground">
          New to HabitFlow?{' '}
          <Link
            href="/register"
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an account <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </p>
      </div>
    </div>
  );
}
