import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'NOCHA_MATCHA_SUPER_SECRET_JWT_KEY_2026';
export const SESSION_COOKIE_NAME = 'nocha_session';

export interface UserSession {
  userId: string;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'STAFF';
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signJwtToken(payload: UserSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '14d' });
}

export function verifyJwtToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession;
  } catch {
    return null;
  }
}

export async function getSessionUser(req?: NextRequest): Promise<UserSession | null> {
  let token: string | undefined;

  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    }
  } else {
    const cookieStore = cookies();
    token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  }

  if (!token) return null;
  return verifyJwtToken(token);
}

