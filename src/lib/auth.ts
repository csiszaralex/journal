import { db } from '@/db/client';
import { logAudit } from '@/db/queries/audit';
import { isRegistrationAllowed } from '@/db/queries/settings';
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
import { and, eq } from 'drizzle-orm';
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

      // New registration = no existing authenticators for this email. Enrolling
      // one is allowed only while the journal has no passkey at all (there would
      // be nobody who could turn the toggle on) or when the toggle says so.
      const hasAuthenticator = db
        .select({ id: authAuthenticators.credentialID })
        .from(authAuthenticators)
        .innerJoin(authUsers, eq(authUsers.id, authAuthenticators.userId))
        .where(and(eq(authUsers.email, user.email)))
        .get();
      if (!hasAuthenticator && !isRegistrationAllowed()) return false;

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
        maxAge: 7 * 24 * 60 * 60,
      },
    },
  },
});

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}
