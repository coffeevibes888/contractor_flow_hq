import { DefaultSession } from 'next-auth';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth from 'next-auth';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JWT } from 'next-auth/jwt';

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    sub: string;
    role: string;
    name: string;
    onboardingCompleted: boolean;
  }
}

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      role: string;
      phoneVerified: Date | null;
      phoneNumber: string | null;
      address?: any;
      shippingAddress?: any;
      billingAddress?: any;
      image?: string;
      onboardingCompleted: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    role: string;
  }
}
