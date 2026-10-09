import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { BrandLogo } from '@/components/layout/brand-logo';

export const metadata = { title: 'Create account | LifeOS' };

export default function RegisterPage() {
  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-xl lg:grid-cols-2">
      <aside className="hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex justify-center pt-3">
          <BrandLogo className="h-24 w-96" inverted />
        </div>
        <div className="space-y-6">
          <p className="text-4xl font-semibold leading-tight">
            Make room for the habits that matter.
          </p>
          <p className="text-primary-foreground/80">
            Start with a simple plan and see every step forward.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5" /> Your progress starts here.
          </div>
        </div>
        <p className="text-sm text-primary-foreground/70">One day at a time.</p>
      </aside>
      <div className="px-6 py-9 sm:px-10 sm:py-12">
        <Link href="/" className="mb-8 inline-flex lg:hidden">
          <BrandLogo className="w-48" />
        </Link>
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Get started
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">A better routine begins with one step.</p>
        </div>
        <SignUpForm />
        <p className="mt-7 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
