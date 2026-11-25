import type { Request, Response } from 'express';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '@san/shared';
import { asyncHandler } from '../../lib/async-handler.js';
import { clearSessionCookie, setSessionCookie } from '../../lib/cookies.js';
import * as authService from './auth.service.js';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input, req);
  setSessionCookie(res, result.token, result.expiresAt, result.rememberMe);
  res.json({ user: result.user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.auth!.user.id, req.auth!.sessionId, req);
  clearSessionCookie(res);
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.auth!.user.id);
  res.json({ user });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = forgotPasswordSchema.parse(req.body);
  const result = await authService.forgotPassword(input.email);
  res.json({
    message:
      'If an account exists for that email address, password reset instructions have been sent.',
    ...(result.resetUrl ? { devResetUrl: result.resetUrl } : {}),
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(input.token, input.password, input.confirmPassword, req);
  clearSessionCookie(res);
  res.json({ message: 'Password updated. You can now sign in with your new password.' });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const input = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.auth!.user.id, req.auth!.sessionId, input, req);
  res.json({ message: 'Password updated successfully.' });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const input = updateProfileSchema.parse(req.body);
  const user = await authService.updateProfile(req.auth!.user.id, input, req);
  res.json({ user });
});
