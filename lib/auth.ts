import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Resend from 'next-auth/providers/resend';
import { db } from './db';
import { users, accounts, sessions, verificationTokens } from './schema';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: 'BalanceWell <coach@balancewell.app>',
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const { Resend: ResendClient } = await import('resend');
        const resend = new ResendClient(provider.apiKey);
        await resend.emails.send({
          from: provider.from,
          to: identifier,
          subject: 'Sign in to BalanceWell',
          html: `
            <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
              <h1 style="font-size: 28px; color: #2C1810;">Your sign-in link</h1>
              <p style="font-size: 18px; color: #7A6355; margin: 16px 0;">
                Tap the button below to sign in to BalanceWell. This link expires in 24 hours.
              </p>
              <a href="${url}" style="display: inline-block; background: #C4714A; color: white; font-size: 20px; font-weight: 600; padding: 16px 32px; border-radius: 16px; text-decoration: none; margin-top: 8px;">
                Sign In
              </a>
            </div>
          `,
        });
      },
    }),
  ],
  pages: {
    signIn: '/login',
    verifyRequest: '/verify',
  },
  session: { strategy: 'database' },
  callbacks: {
    session: async ({ session, user }) => {
      session.user.id = user.id;
      return session;
    },
  },
});
