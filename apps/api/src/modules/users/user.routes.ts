import { Router } from 'express';
import { z } from 'zod';
import {
  adminResetPasswordSchema,
  PERMISSIONS,
  userCreateSchema,
  userListQuerySchema,
  userUpdateSchema,
} from '@san/shared';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './user.controller.js';

const idParam = z.object({ id: z.string().uuid() });

export const usersRouter = Router();
usersRouter.use(requireAuth);
usersRouter.use(requirePermission(PERMISSIONS.USERS_MANAGE));

usersRouter.get('/roles', controller.roles);
usersRouter.get('/', validate({ query: userListQuerySchema }), controller.list);
usersRouter.post('/', validate({ body: userCreateSchema }), controller.create);
usersRouter.patch(
  '/:id',
  validate({ params: idParam, body: userUpdateSchema }),
  controller.update,
);
usersRouter.post(
  '/:id/reset-password',
  validate({ params: idParam, body: adminResetPasswordSchema }),
  controller.resetPassword,
);
usersRouter.post('/:id/archive', validate({ params: idParam }), controller.archive);
