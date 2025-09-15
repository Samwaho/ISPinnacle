import { createTRPCRouter } from '../init';
import { userRouter } from './user';
import { organizationRouter } from './organization';
import { stationsRouter } from './stations';
import { packagesRouter } from './packages';
import { customerRouter } from './customer';
import { mpesaRouter } from './mpesa';
import { transactionsRouter } from './transactions';
import { smsRouter } from './sms';

export const appRouter = createTRPCRouter({
  user: userRouter,
  organization: organizationRouter,
  stations: stationsRouter,
  packages: packagesRouter,
  customer: customerRouter,
  mpesa: mpesaRouter,
  transactions: transactionsRouter,
  sms: smsRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;