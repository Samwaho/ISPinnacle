import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/db";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { loginSchema } from "./schemas";

// Notice this is only an object, not a full Auth.js instance
export default {
  // Trust the host defined by NEXTAUTH_URL / incoming request host
  trustHost: true,
  providers: [
    Credentials({
      async authorize(credentials) {
        const validatedCredentials = loginSchema.safeParse(credentials);

        if (!validatedCredentials.success) {
          return null;
        }
        const { email, password } = validatedCredentials.data;
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user || !user.password) {
          return null;
        }

        const bcryptModule = await import('bcryptjs');
        const bcrypt = bcryptModule.default ?? bcryptModule;
        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }
        return user;
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
} satisfies NextAuthConfig;
