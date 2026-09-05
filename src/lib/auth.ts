import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { jwtSecretBytes } from '@/lib/secrets';
import prisma from '@/lib/prisma';
import {
  isFullAdminRole,
  isStaffRole,
  isSuperAdminUsername,
  isSuperAdminUser,
} from '@/lib/roles';

export { isFullAdminRole, isStaffRole, isSuperAdminUsername, isSuperAdminUser };

const COOKIE_NAME = 'gdvnc_token';
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

export async function signToken(payload: {
  userId: string;
  username: string;
  role: string;
  tokenVersion?: number;
}): Promise<string> {
  return new SignJWT({ ...payload, tokenVersion: payload.tokenVersion ?? 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(jwtSecretBytes());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecretBytes());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  });
}

export async function getAuthUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function bumpTokenVersion(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

/** JWT identity with current username/role/tokenVersion from the database. */
export async function getSessionUser(): Promise<JwtPayload | null> {
  const jwt = await getAuthUser();
  if (!jwt?.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: jwt.userId },
    select: { id: true, username: true, role: true, tokenVersion: true },
  });
  if (!user) return null;
  if ((jwt.tokenVersion ?? 0) !== user.tokenVersion) return null;
  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };
}

export async function requireAdmin(): Promise<JwtPayload> {
  const user = await getSessionUser();
  if (!user || !isStaffRole(user.role)) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireFullAdmin(): Promise<JwtPayload> {
  const user = await getSessionUser();
  if (!user || !isFullAdminRole(user.role)) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireSuperAdmin(): Promise<JwtPayload> {
  const user = await getSessionUser();
  if (!user || !isSuperAdminUser(user)) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireAuth(): Promise<JwtPayload> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}
