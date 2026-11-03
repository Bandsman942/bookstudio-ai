import { cookies } from 'next/headers';
import { prisma } from '@bookstudio/database';
import {
  hashToken, newSessionToken, verifyPassword, sessionCookieName,
  isSameOrigin, errorResponse,
} from '@/lib/security';
import { consumeLoginAttempt, loginThrottleKey } from '@/lib/login-throttle';

// A dummy scrypt digest avoids a trivial timing-based user enumeration channel.
const DUMMY_PASSWORD_HASH = 'scrypt$16384$8$1$00000000000000000000000000000000$' + '0'.repeat(128);

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return errorResponse('ORIGIN_FORBIDDEN', 403);
  const data = await req.json().catch(() => null);
  if (!data || typeof data.email !== 'string' || typeof data.password !== 'string') {
    return errorResponse('VALIDATION_ERROR');
  }
  const email = data.email.trim().toLowerCase();
  if (!email || email.length > 320 || data.password.length > 128 || data.password.length === 0) {
    return errorResponse('UNAUTHENTICATED', 401);
  }

  try {
    // Fail closed if the database-backed limiter cannot be reached.
    const allowed = await consumeLoginAttempt(email);
    if (!allowed) {
      return Response.json({ error: 'AUTH_RATE_LIMITED' }, {
        status: 429,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '900' },
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordMatches = await verifyPassword(data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || user.status !== 'ACTIVE' || !passwordMatches) {
      return errorResponse('UNAUTHENTICATED', 401);
    }

    const token = newSessionToken();
    const duration = 7 * 24 * 60 * 60;
    const previousToken = (await cookies()).get(sessionCookieName)?.value;
    const existingHash = previousToken ? hashToken(previousToken) : null;

    await prisma.$transaction(async (tx) => {
      // Rotate a previously authenticated browser's token at sign-in.
      if (existingHash) {
        await tx.session.updateMany({
          where: { tokenHash: existingHash, userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await tx.session.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + duration * 1000) },
      });
      await tx.authThrottle.deleteMany({ where: { key: loginThrottleKey(email) } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'AUTH_LOGIN_SUCCESS' } });
    });

    const response = Response.json({ ok: true });
    response.headers.set('Set-Cookie', `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${duration}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    // No password, e-mail, connection string or internal error in the response.
    return errorResponse('AUTH_TEMPORARILY_UNAVAILABLE', 503);
  }
}
