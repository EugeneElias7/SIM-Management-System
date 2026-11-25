import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, changePasswordSchema } from '@san/shared';
import type { UpdateProfileInput } from '@san/shared';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/auth/auth-context';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
    },
  });
  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  React.useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
  }, [user, profileForm]);

  const profileMutation = useMutation({
    mutationFn: (values: UpdateProfileInput) =>
      apiRequest('/auth/profile', { method: 'PATCH', body: JSON.stringify(values) }),
    onSuccess: () => {
      refresh();
    },
  });
  const passwordMutation = useMutation({
    mutationFn: (values: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader title="My Profile" subtitle="Update your account details and password." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))}>
              <div>
                <Label>First name</Label>
                <Input {...profileForm.register('firstName')} />
              </div>
              <div>
                <Label>Last name</Label>
                <Input {...profileForm.register('lastName')} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" {...profileForm.register('email')} />
              </div>
              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? 'Saving…' : 'Save profile'}
              </Button>
              {profileMutation.isError && (
                <p className="text-sm text-red-600">{(profileMutation.error as Error).message}</p>
              )}
              {profileMutation.isSuccess && <p className="text-sm text-green-600">Profile updated.</p>}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={passwordForm.handleSubmit((values) => passwordMutation.mutate(values))}>
              <div>
                <Label>Current password</Label>
                <Input type="password" {...passwordForm.register('currentPassword')} />
              </div>
              <div>
                <Label>New password</Label>
                <Input type="password" {...passwordForm.register('newPassword')} />
              </div>
              <div>
                <Label>Confirm password</Label>
                <Input type="password" {...passwordForm.register('confirmPassword')} />
              </div>
              <Button type="submit" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? 'Updating…' : 'Update password'}
              </Button>
              {passwordMutation.isError && (
                <p className="text-sm text-red-600">{(passwordMutation.error as Error).message}</p>
              )}
              {passwordMutation.isSuccess && <p className="text-sm text-green-600">Password updated.</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
export default ProfilePage;
