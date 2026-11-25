import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../../middleware/rate-limit.js';
import * as controller from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', authLimiter, controller.login);
authRouter.post('/logout', requireAuth, controller.logout);
authRouter.get('/me', requireAuth, controller.me);
authRouter.post('/forgot-password', passwordResetLimiter, controller.forgotPassword);
authRouter.post('/reset-password', passwordResetLimiter, controller.resetPassword);
authRouter.post('/change-password', requireAuth, controller.changePassword);
authRouter.patch('/profile', requireAuth, controller.updateProfile);
