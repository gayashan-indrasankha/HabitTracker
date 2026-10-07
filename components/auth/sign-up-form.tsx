'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signUp } from '@/lib/auth/client';
import { RegisterSchema, type RegisterValues } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignUpForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: RegisterValues) {
    setServerError(null);
    try {
      const result = await signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      if (result.error) {
        setServerError(
          result.error.status === 422
            ? 'An account with this email already exists.'
            : (result.error.message ?? 'Unable to create your account.'),
        );
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setServerError('Unable to create your account right now. Please try again.');
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="register-name">Your name</Label>
        <Input
          id="register-name"
          type="text"
          autoComplete="name"
          placeholder="Alex Morgan"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'register-name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id="register-name-error" role="alert" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-email">Email address</Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'register-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="register-email-error" role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-password">Password</Label>
        <div className="relative">
          <Input
            id="register-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="pr-12"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? 'register-password-error' : 'register-password-hint'
            }
            {...register('password')}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Eye aria-hidden="true" className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors.password ? (
          <p id="register-password-error" role="alert" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        ) : (
          <p id="register-password-hint" className="text-xs text-muted-foreground">
            Use at least 8 characters.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-confirm-password">Confirm password</Label>
        <Input
          id="register-confirm-password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? 'register-confirm-error' : undefined}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p id="register-confirm-error" role="alert" className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      {serverError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}
      <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
