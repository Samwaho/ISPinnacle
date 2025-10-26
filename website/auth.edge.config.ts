import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe NextAuth config used by middleware only
export default {
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
} satisfies NextAuthConfig;

