import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { forgotPasswordSchema, type LoginInput } from '@san/shared';
import { z } from 'zod';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({ email: forgotPasswordSchema.shape.email });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [devUrl, setDevUrl] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = async (values: FormValues) => {
    const result = await apiRequest<{ message: string; devResetUrl?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(values),
    });
    setDevUrl(result.devResetUrl ?? null);
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold text-ink-900">Forgot password</h2>
          <p className="mt-1 text-sm text-ink-500">
            Enter your account email and we will send a reset link.
          </p>

          {submitted ? (
            <div className="mt-6 space-y-3">
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                If an account exists for that email, reset instructions have been sent.
              </div>
              {devUrl && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Development reset link:{' '}
                  <a href={devUrl} className="font-medium underline">
                    {devUrl}
                  </a>
                </div>
              )}
              <Link to="/login" className="block text-sm font-medium text-navy-600 hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full">
                Send reset link
              </Button>
              <Link to="/login" className="block text-center text-sm text-ink-500 hover:text-ink-800">
                Back to sign in
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
export default ForgotPasswordPage;
