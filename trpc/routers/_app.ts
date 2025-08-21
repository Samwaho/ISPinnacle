import { createTRPCRouter } from '../init';
import { userRouter } from './user';
import { organizationRouter } from './organization';
import { stationsRouter } from './stations';
import { packagesRouter } from './packages';
import { customerRouter } from './customer';
export const appRouter = createTRPCRouter({
  user: userRouter,
  organization: organizationRouter,
  stations: stationsRouter,
  packages: packagesRouter,
  customer: customerRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;