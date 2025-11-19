import { createTRPCRouter } from '../init';
import { userRouter } from './user';
import { organizationRouter } from './organization';
import { stationsRouter } from './stations';
import { packagesRouter } from './packages';
import { customerRouter } from './customer';
import { mpesaRouter } from './mpesa';
import { kopokopoRouter } from './kopokopo';
import { hotspotRouter } from './hotspot';

import { transactionsRouter } from './transactions';
import { smsRouter } from './sms';
import { expensesRouter } from './expenses';
import { analyticsRouter } from './analytics';
import { devicesRouter } from './devices';

export const appRouter = createTRPCRouter({
  user: userRouter,
  organization: organizationRouter,
  stations: stationsRouter,
  packages: packagesRouter,
  customer: customerRouter,
  mpesa: mpesaRouter,
  kopokopo: kopokopoRouter,
  hotspot: hotspotRouter,
  transactions: transactionsRouter,
  sms: smsRouter,
  expenses: expensesRouter,
  analytics: analyticsRouter,
  devices: devicesRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
