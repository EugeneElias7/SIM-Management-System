import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { simsRouter } from './modules/sims/sim.routes.js';
import { companiesRouter } from './modules/companies/company.routes.js';
import { machinesRouter } from './modules/machines/machine.routes.js';
import { expiryRouter, renewalsRouter } from './modules/expiry/expiry.routes.js';
import { notificationsRouter } from './modules/notifications/notification.routes.js';
import { reportsRouter } from './modules/reports/report.routes.js';
import { activityRouter } from './modules/activity/activity.routes.js';
import { usersRouter } from './modules/users/user.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { lookupsRouter } from './modules/lookups/lookups.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/sims', simsRouter);
apiRouter.use('/companies', companiesRouter);
apiRouter.use('/machines', machinesRouter);
apiRouter.use('/expiry', expiryRouter);
apiRouter.use('/renewals', renewalsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/activity', activityRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/lookups', lookupsRouter);
