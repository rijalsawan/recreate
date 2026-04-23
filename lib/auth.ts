import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { planToSlug } from '@/lib/plans';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/',   // Redirect to home where AuthModal handles login
    error: '/',
  },
  callbacks: {
    async jwt({ token, user }) {
      const userId = user?.id || (token.id as string | undefined);

      if (userId) {
        token.id = userId;

        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { credits: true, plan: true, role: true },
        });

        if (dbUser) {
          token.credits = dbUser.credits;
          token.plan = planToSlug(dbUser.plan);
          token.role = dbUser.role as 'USER' | 'ADMIN';
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.credits = token.credits as number;
        session.user.plan = (token.plan as 'free' | 'pro' | 'business' | undefined) ?? 'free';
        session.user.role = (token.role as 'USER' | 'ADMIN' | undefined) ?? 'USER';
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Seed initial credits for new users
      if (user.id) {
        await prisma.creditTransaction.create({
          data: {
            userId: user.id,
            amount: 100,
            type: 'BONUS',
            description: 'Welcome bonus credits',
          },
        });
      }
    },
  },
});
