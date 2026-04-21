import NextAuth from "next-auth";
import Passkey from "next-auth/providers/passkey";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/client";
import {
  authUsers,
  authAccounts,
  authSessions,
  authVerificationTokens,
  authAuthenticators,
} from "@/db/schema";
import { logAudit } from "@/db/queries/audit";
import { getRegistrationEnabled } from "@/db/queries/settings";
import { sql } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: authUsers,
    accountsTable: authAccounts,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
    authenticatorsTable: authAuthenticators,
  }),
  providers: [Passkey],
  experimental: { enableWebAuthn: true },
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    signIn({ user }) {
      const allowedEmail = process.env.ALLOWED_EMAIL;
      if (!allowedEmail || user.email !== allowedEmail) return false;

      // Check whether this is a new registration (no existing authenticators for this email)
      const hasAuthenticator = db.get(sql`
        SELECT 1 FROM authenticator a
        INNER JOIN "user" u ON u.id = a.userId
        WHERE u.email = ${user.email}
        LIMIT 1
      `);
      if (!hasAuthenticator && !getRegistrationEnabled()) return false;

      return true;
    },
  },
  events: {
    createUser({ user }) {
      logAudit("auth.register", { user_id: user.id, email: user.email });
    },
    signIn({ user, isNewUser }) {
      if (!isNewUser) {
        logAudit("auth.login", { user_id: user.id, email: user.email });
      }
    },
    signOut() {
      logAudit("auth.logout");
    },
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: 90 * 24 * 60 * 60,
      },
    },
  },
});
