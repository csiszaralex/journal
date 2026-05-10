import { db } from '@/db/client';
import { logAudit } from '@/db/queries/audit';
import { getRegistrationEnabled } from '@/db/queries/settings';
import {
  authAccounts,
  authAuthenticators,
  authSessions,
  authUsers,
  authVerificationTokens,
} from '@/db/schema';
import { env } from '@/env';
import { friendlyNameFromUA } from '@/lib/user-agent';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq, sql } from 'drizzle-orm';
import NextAuth from 'next-auth';
import Passkey from 'next-auth/providers/passkey';
import { headers } from 'next/headers';

const baseAdapter = DrizzleAdapter(db, {
  usersTable: authUsers,
  accountsTable: authAccounts,
  sessionsTable: authSessions,
  verificationTokensTable: authVerificationTokens,
  authenticatorsTable: authAuthenticators,
});

const adapter: typeof baseAdapter = {
  ...baseAdapter,
  async createSession(session) {
    const created = await baseAdapter.createSession!(session);
    try {
      const ua = (await headers()).get('user-agent');
      db.update(authSessions)
        .set({
          userAgent: ua,
          name: friendlyNameFromUA(ua),
          createdAt: new Date(),
        })
        .where(eq(authSessions.sessionToken, session.sessionToken))
        .run();
    } catch {
      // headers() unavailable outside request scope — leave defaults
    }
    return created;
  },
  async createAuthenticator(authenticator) {
    const created = await baseAdapter.createAuthenticator!(authenticator);
    try {
      const ua = (await headers()).get('user-agent');
      db.update(authAuthenticators)
        .set({
          name: friendlyNameFromUA(ua),
          createdAt: new Date(),
        })
        .where(eq(authAuthenticators.credentialID, authenticator.credentialID))
        .run();
    } catch {
      // headers() unavailable outside request scope — leave defaults
    }
    return created;
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  providers: [Passkey],
  experimental: { enableWebAuthn: true },
  session: { strategy: 'database' },
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  callbacks: {
    signIn({ user }) {
      if (user.email !== env.ALLOWED_EMAIL) return false;

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
      logAudit('auth.register', { user_id: user.id, email: user.email });
    },
    signIn({ user, isNewUser }) {
      if (!isNewUser) {
        logAudit('auth.login', { user_id: user.id, email: user.email });
      }
    },
    signOut() {
      logAudit('auth.logout');
    },
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 90 * 24 * 60 * 60,
      },
    },
  },
});

