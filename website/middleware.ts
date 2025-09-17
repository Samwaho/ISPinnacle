import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_REDIRECT_URL,
  publicRoutes,
} from "./routes";
import authConfig from "./auth.config";
import NextAuth from "next-auth";

export const { auth } = NextAuth(authConfig);
export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute = authRoutes.includes(pathname);
  const isApiAuthRoute = pathname.startsWith(apiAuthPrefix);
  const isTRPCRoute = pathname.startsWith("/api/trpc");

  if (isApiAuthRoute || isTRPCRoute) {
    return null;
  }

  // if (isAuthRoute) {
  //   if (isLoggedIn) {
  //     return Response.redirect(new URL(DEFAULT_REDIRECT_URL, req.nextUrl));
  //   }
  //   return null;
  // }

  // if (isPublicRoute) {
  //   if (isLoggedIn) {
  //     return Response.redirect(new URL(DEFAULT_REDIRECT_URL, req.nextUrl));
  //   }
  //   return null;
  // }
  // if (!isLoggedIn && !isPublicRoute) {
  //   return Response.redirect(new URL("/auth/login", req.nextUrl));
  // }
  if (!isLoggedIn && !isPublicRoute) {
    return Response.redirect(new URL("/auth/login", req.nextUrl));
  }

  return null;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
