import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@san/shared';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });
  const [serverError, setServerError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (values: LoginInput) => login(values.email, values.password, values.rememberMe),
    onSuccess: () => navigate('/', { replace: true }),
    onError: (error) => {
      setServerError(error instanceof ApiError ? error.message : 'Sign in failed. Please try again.');
    },
  });

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-navy-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-navy-900 font-extrabold">
            SAN
          </div>
          <div>
            <p className="text-lg font-bold tracking-wide">SAN SOLUTION</p>
            <p className="text-xs text-navy-200">SIM Management System</p>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-bold leading-tight">
            Keep every SIM card, expiry and renewal under control.
          </h1>
          <p className="mt-4 text-sm text-navy-100">
            A single operational console for SIM inventory, client assignments, machinery linkage,
            automated expiry reminders and renewal history.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-navy-200">
            <li>• Real-time expiry tracking with 30/15/7 day reminders</li>
            <li>• Permanent assignment and renewal history</li>
            <li>• Role-based access and full audit trail</li>
            <li>• CSV, Excel and PDF exports</li>
          </ul>
        </div>
        <p className="text-xs text-navy-300">© {new Date().getFullYear()} SAN SOLUTION. All rights reserved.</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-ink-50 px-6 py-10">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="mb-6 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-white font-extrabold">
                SAN
              </div>
            </div>
            <h2 className="text-2xl font-bold text-ink-900">Sign in</h2>
            <p className="mt-1 text-sm text-ink-500">
              Use your SAN SOLUTION administrator credentials.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={handleSubmit((values) => {
                setServerError(null);
                mutation.mutate(values);
              })}
            >
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" autoComplete="email" {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-ink-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-ink-300 text-navy-500 focus:ring-navy-500"
                    {...register('rememberMe')}
                  />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-navy-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              {serverError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
export default LoginPage;
