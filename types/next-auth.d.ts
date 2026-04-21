import { DefaultSession, DefaultJWT } from 'next-auth';

type SessionPlan = 'free' | 'pro' | 'business';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      credits: number;
      plan: SessionPlan;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    credits?: number;
    plan?: SessionPlan;
  }
}
