import { jwtVerify } from 'jose';

export interface MobileJwtPayload {
  userId: string;
  email: string;
  role: string;
}

export async function verifyMobileToken(token: string): Promise<MobileJwtPayload | null> {
  try {
    const secret = new TextEncoder().encode(
      process.env.MOBILE_JWT_SECRET || process.env.NEXTAUTH_SECRET || ''
    );
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}
