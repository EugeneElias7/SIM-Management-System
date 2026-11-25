import '@fontsource/playfair-display/700.css';
import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import gsap from 'gsap';
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
  const logoRef = React.useRef<HTMLDivElement>(null);
  const headingRef = React.useRef<HTMLDivElement>(null);
  const formRef = React.useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      if (logoRef.current) {
        gsap.fromTo(logoRef.current, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' });
      }
      if (headingRef.current) {
        gsap.fromTo(headingRef.current, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 1.1, delay: 0.25, ease: 'power3.out' });
      }
      if (formRef.current) {
        gsap.fromTo(formRef.current, { opacity: 0, x: 48 }, { opacity: 1, x: 0, duration: 1.1, delay: 0.45, ease: 'power3.out' });
      }
    });
    return () => ctx.revert();
  }, []);

  const mutation = useMutation({
    mutationFn: async (values: LoginInput) => login(values.email, values.password, values.rememberMe),
    onSuccess: () => navigate('/', { replace: true }),
    onError: (error) => {
      setServerError(error instanceof ApiError ? error.message : 'Sign in failed. Please try again.');
    },
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1F3B]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/background.png')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050d1f]/80 via-[#050d1f]/50 to-[#050d1f]/25" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050d1f]/70 via-transparent to-transparent" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen flex-col px-5 py-6 sm:px-8 md:px-12 lg:px-16">
        <div ref={logoRef} className="flex items-center">
          {!logoError ? (
            <div className="inline-flex items-center rounded-2xl bg-white/20 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl border border-white/30">
              <img
                src="/assets/san-solutions-logo.webp"
                alt="San Solution"
                className="h-9 w-auto object-contain"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="inline-flex items-center gap-3 rounded-2xl bg-white/20 px-4 py-3 backdrop-blur-xl border border-white/30">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#0B3A70] text-lg font-extrabold">
                SAN
              </div>
              <div className="text-white">
                <p className="text-sm font-bold tracking-wide">SAN SOLUTION</p>
                <p className="text-[11px] text-white/70">SIM Management</p>
              </div>
            </div>
          )}
        </div>

        <main className="flex flex-1 flex-col items-center justify-center gap-10 py-8 md:flex-row md:items-center md:justify-between md:gap-16">
          <div ref={headingRef} className="max-w-xl text-center text-white md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/75">
              SIM MANAGEMENT SYSTEM
            </p>
            <h1
              className="mt-4 text-[34px] font-bold leading-[1.05] text-white sm:text-[42px] md:text-[52px] lg:text-[60px]"
              style={{ fontFamily: '"Playfair Display", "Times New Roman", serif' }}
            >
              Monitor.
              <br />
              Manage.
              <br />
              Renew.
            </h1>
            <p className="mt-5 max-w-md text-base text-white/80 md:text-lg">
              All your machinery SIMs. One centralized platform.
            </p>
          </div>

          <div ref={formRef} className="w-full max-w-[400px]">
            <div className="rounded-2xl bg-white/95 p-7 shadow-[0_24px_60px_rgba(5,13,31,0.35)] backdrop-blur-md sm:p-9 md:p-10">
              <div className="mb-6">
                <h2
                  className="text-2xl font-bold text-[#172B42]"
                  style={{ fontFamily: '"Playfair Display", "Times New Roman", serif' }}
                >
                  Welcome Back
                </h2>
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
                    className="mt-1.5 border-[#DCE4ED] bg-white text-[#172B42] placeholder:text-[#94A3B8] focus:border-[#0B3A70] focus:ring-[#0B3A70]/20"
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
                      className="border-[#DCE4ED] bg-white pr-10 text-[#172B42] placeholder:text-[#94A3B8] focus:border-[#0B3A70] focus:ring-[#0B3A70]/20"
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

                <div className="flex items-center justify-between gap-3">
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
          </div>
        </main>
      </div>
    </div>
  );
}
export default LoginPage;
