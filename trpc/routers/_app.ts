import { createTRPCRouter } from '../init';
import { userRouter } from './user';
import { organizationRouter } from './organization';
import { stationsRouter } from './stations';
export const appRouter = createTRPCRouter({
  user: userRouter,
  organization: organizationRouter,
  stations: stationsRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;