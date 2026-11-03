import { createHash } from 'node:crypto';
import { prisma } from '@bookstudio/database';

/**
 * Postgres-based sliding fixed window: cross-function and cross-instance.
 * Keys are one-way digests of normalized identifiers, not plaintext e-mails.
 *
 * Eight failed/attempted requests per e-mail per 15 minutes, then a 15-minute
 * temporary lock. Production should ALSO enforce an edge-level IP/WAF limit.
 */
const WINDOW_MINUTES = 15;
const LIMIT = 8;

export function loginThrottleKey(email: string): string {
  return createHash('sha256').update('bookstudio:login:v1:' + email.toLowerCase().trim()).digest('hex');
}

export async function consumeLoginAttempt(email: string): Promise<boolean> {
  const key = loginThrottleKey(email);
  const result = await prisma.$queryRaw<Array<{attempts: number; locked_until: Date | null}>>`
    INSERT INTO "auth_throttles" ("key","attempts","window_start","locked_until","updated_at")
    VALUES (${key}, 1, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP)
    ON CONFLICT ("key") DO UPDATE
    SET "attempts" = CASE
        WHEN "auth_throttles"."window_start" < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
          THEN 1
        ELSE "auth_throttles"."attempts" + 1
      END,
      "window_start" = CASE
        WHEN "auth_throttles"."window_start" < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
          THEN CURRENT_TIMESTAMP
        ELSE "auth_throttles"."window_start"
      END,
      "locked_until" = CASE
        WHEN "auth_throttles"."window_start" < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
          THEN NULL
        WHEN "auth_throttles"."locked_until" > CURRENT_TIMESTAMP
          THEN "auth_throttles"."locked_until"
        WHEN "auth_throttles"."attempts" + 1 > ${LIMIT}
          THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
        ELSE NULL
      END,
      "updated_at" = CURRENT_TIMESTAMP
    RETURNING "attempts", "locked_until"
  `;
  if (!result[0]) throw new Error('LOGIN_THROTTLE_UNAVAILABLE');
  return !result[0].locked_until || result[0].locked_until <= new Date();
}

export async function clearLoginThrottle(email: string): Promise<void> {
  await prisma.authThrottle.deleteMany({ where: { key: loginThrottleKey(email) } });
}
