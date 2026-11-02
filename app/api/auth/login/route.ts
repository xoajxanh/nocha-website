import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureInitialSeed } from '@/lib/db';
import { comparePassword, signJwtToken, SESSION_COOKIE_NAME } from '@/lib/auth';

const loginAttemptMap = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 phút
const MAX_FAILED_LOGINS = 8;

export async function POST(req: NextRequest) {
  try {
    await ensureInitialSeed();
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Vui lòng nhập tên đăng nhập và mật khẩu' },
        { status: 400 }
      );
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const rateKey = `${clientIp}:${username.trim().toLowerCase()}`;
    const now = Date.now();
    const existingAttempt = loginAttemptMap.get(rateKey);

    if (existingAttempt && now < existingAttempt.resetAt && existingAttempt.count >= MAX_FAILED_LOGINS) {
      return NextResponse.json(
        {
          error:
            'Bạn đã nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 5 phút!',
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user || user.isDeleted || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      const prev = existingAttempt && now < existingAttempt.resetAt ? existingAttempt.count : 0;
      loginAttemptMap.set(rateKey, { count: prev + 1, resetAt: now + LOGIN_WINDOW_MS });
      return NextResponse.json(
        { error: 'Tài khoản hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    if (user.isLocked) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Vui lòng liên hệ Admin!' },
        { status: 403 }
      );
    }

    const valid = comparePassword(password, user.passwordHash);
    if (!valid) {
      const prev = existingAttempt && now < existingAttempt.resetAt ? existingAttempt.count : 0;
      loginAttemptMap.set(rateKey, { count: prev + 1, resetAt: now + LOGIN_WINDOW_MS });
      return NextResponse.json(
        { error: 'Tài khoản hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    loginAttemptMap.delete(rateKey);

    const sessionPayload = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role as 'ADMIN' | 'STAFF',
    };

    const token = signJwtToken(sessionPayload);

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 14, // 14 days
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Lỗi hệ thống khi đăng nhập, vui lòng thử lại!' },
      { status: 500 }
    );
  }
}

