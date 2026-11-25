import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { loginSchema, type LoginInput } from '@san/shared';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);
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
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left panel — brand + industrial background */}
      <section
        className="relative flex min-h-[42vh] flex-1 flex-col justify-between overflow-hidden bg-[#0B1F3B] md:min-h-screen md:w-[60%]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(11,28,58,0.55) 0%, rgba(11,28,58,0.35) 45%, rgba(11,28,58,0.75) 100%), url('/images/san-solution-login-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative z-10 px-10 pt-10 md:px-12 md:pt-12">
          {!logoError ? (
            <img
              src="/images/san-solution-logo.png"
              alt="San Solution"
              height={44}
              className="h-11 w-auto object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-[#0B3A70] text-lg font-extrabold">
                SAN
              </div>
              <div className="text-white">
                <p className="text-sm font-bold tracking-wide">SAN SOLUTION</p>
                <p className="text-[11px] text-white/70">SIM Management</p>
              </div>
            </div>
          )}
        </div>

        <div className="relative z-10 max-w-xl px-10 pb-12 md:px-12 md:pb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
            SIM MANAGEMENT SYSTEM
          </p>
          <h1 className="mt-3 text-[36px] font-semibold leading-tight text-white md:text-[40px]">
            Monitor. Manage. Renew.
          </h1>
          <p className="mt-4 text-base text-white/85 md:text-lg">
            All your machinery SIMs. One centralized platform.
          </p>
        </div>
      </section>

      {/* Right panel — login form */}
      <section className="flex flex-1 items-center justify-center bg-[#F4F7FB] px-6 py-10 md:w-[40%] md:px-10">
        <div className="w-full max-w-[400px] rounded-2xl bg-white p-9 shadow-[0_12px_40px_rgba(15,23,42,0.08)] md:p-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#172B42]">Welcome Back</h2>
            <p className="mt-1 text-sm text-[#64748B]">Sign in to your account to continue.</p>
          </div>

          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) => {
              setServerError(null);
              mutation.mutate(values);
            })}
          >
            <div>
              <Label htmlFor="email" className="text-[#64748B]">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="mt-1.5 border-[#DCE4ED] text-[#172B42] placeholder:text-[#94A3B8] focus:border-[#0B3A70] focus:ring-[#0B3A70]/20"
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="password" className="text-[#64748B]">
                Password
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="border-[#DCE4ED] pr-10 text-[#172B42] placeholder:text-[#94A3B8] focus:border-[#0B3A70] focus:ring-[#0B3A70]/20"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#64748B] transition hover:bg-[#F4F7FB] hover:text-[#172B42]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#64748B]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[#DCE4ED] text-[#0B3A70] focus:ring-[#0B3A70]"
                  {...register('rememberMe')}
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-[#0B3A70] hover:underline">
                Forgot password?
              </Link>
            </div>

            {serverError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#0B3A70] text-white hover:bg-[#092f5a]"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-[#64748B]">
            © 2026 San Solution. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  );
}
export default LoginPage;
