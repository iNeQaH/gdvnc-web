import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken, setAuthCookie } from '@/lib/auth';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { isBrowserSameOriginFetch } from '@/lib/origin';
import { publicApiError } from '@/lib/apiError';
import { logAudit } from '@/lib/audit';
import { isSuperAdminUser } from '@/lib/roles';
import { sanitizeUserClan } from '@/lib/clan';

/** Constant-time padding when user is missing (mitigates login enumeration). */
const DUMMY_PASSWORD_HASH = '$2b$10$20mcQhifvE3Tbmulxl25WuJKjcwe0FOqBxWVDK08snzvv.UgK.lbK';

export async function POST(req: Request) {
  try {
    if (!isBrowserSameOriginFetch(req)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
    }

    // Relaxed rate limits for production usability: 25 requests per 5 minutes per IP
    const ip = getClientIp(req);
    const limited = rateLimit(`login:${ip}`, 25, 300_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const { username, identifier, password, locale, totpToken } = await req.json();
    const loginInput = (identifier || username || '').trim();
    const en = locale === 'en';

    if (!loginInput || !password || typeof password !== 'string') {
      return NextResponse.json({ error: en ? 'Please enter your username/email and password.' : 'Vui lòng nhập đầy đủ tài khoản/email và mật khẩu.' }, { status: 400 });
    }
    if (password.length > 128) {
      return NextResponse.json({ error: en ? 'Incorrect username / email or password.' : 'Tên người dùng / Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    const lowered = loginInput.toLowerCase();
    // Relaxed identifier rate limit: 15 requests per 5 minutes
    const limitedId = rateLimit(`login-id:${lowered}`, 15, 300_000);
    if (!limitedId.ok) return rateLimitResponse(limitedId.retryAfterSec);
    const matches = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "User"
      WHERE LOWER("username") = ${lowered}
         OR ("email" IS NOT NULL AND LOWER("email") = ${lowered})
      LIMIT 1
    `;
    const user = matches[0]?.id
      ? await prisma.user.findUnique({
          where: { id: matches[0].id },
          select: {
            id: true,
            username: true,
            role: true,
            avatarUrl: true,
            discordTag: true,
            gdUsername: true,
            gdVerified: true,
            classicPp: true,
            platformerPp: true,
            creatorPoints: true,
            spPoints: true,
            supporterUntil: true,
            nameColor: true,
            nameGradient: true,
            nameGlow: true,
            nameFont: true,
            hasGlitchTheme: true,
            easterEggCompleted: true,
            passwordHash: true,
            tokenVersion: true,
            isBanned: true,
            bannedUntil: true,
            banReason: true,
            failedLoginAttempts: true,
            lockedUntil: true,
            totpEnabled: true,
            totpSecret: true,
            clanMember: {
              select: {
                role: true,
                clan: {
                  select: {
                    id: true,
                    name: true,
                    tag: true,
                    slug: true,
                    color: true,
                    colorGradient: true,
                    isSuspended: true,
                    contributions: {
                      select: {
                        userId: true,
                        spPledged: true,
                        user: {
                          select: {
                            supporterUntil: true,
                            spGrants: {
                              select: { amount: true, expiresAt: true },
                            },
                          },
                        },
                      },
                    },
                    members: {
                      select: { userId: true },
                    },
                  },
                },
              },
            },
          },
        })
      : null;

    // Check database-level progressive account lock
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const waitSec = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000));
      await logAudit(user.id, 'LOGIN_FAILED', { reason: 'account_locked', waitSec }, ip);
      return NextResponse.json(
        {
          error: en
            ? `Account temporarily locked due to multiple failed login attempts. Please wait ${waitSec}s or reset your password.`
            : `Tài khoản đang tạm khóa do nhập sai mật khẩu nhiều lần. Vui lòng đợi ${waitSec} giây hoặc đặt lại mật khẩu.`,
          retryAfterSec: waitSec,
          suggestReset: true,
          remainingAttempts: 0,
        },
        { status: 429, headers: { 'Retry-After': String(waitSec) } }
      );
    }

    const hashToCheck = user?.passwordHash || DUMMY_PASSWORD_HASH;
    const isMatch = await bcrypt.compare(password, hashToCheck);
    if (!user?.passwordHash || !isMatch) {
      let nextAttempts = 0;
      let retryAfterSec = 0;
      let suggestReset = false;

      if (user?.id) {
        nextAttempts = (user.failedLoginAttempts || 0) + 1;
        let newLockedUntil: Date | null = null;

        if (nextAttempts >= 20) {
          retryAfterSec = 15 * 60; // 15 minutes lockout
          newLockedUntil = new Date(Date.now() + retryAfterSec * 1000);
          suggestReset = true;
        } else if (nextAttempts >= 15) {
          retryAfterSec = 120; // 2 minutes cooldown
          newLockedUntil = new Date(Date.now() + retryAfterSec * 1000);
          suggestReset = true;
        } else if (nextAttempts >= 10) {
          retryAfterSec = 30; // 30 seconds cooldown
          newLockedUntil = new Date(Date.now() + retryAfterSec * 1000);
          suggestReset = true;
        } else if (nextAttempts >= 4) {
          suggestReset = true;
        }

        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: nextAttempts,
              lockedUntil: newLockedUntil,
              lastFailedLoginAt: new Date(),
            },
          });
        } catch (dbErr) {
          console.error('Failed to update login attempts:', dbErr);
        }
      }

      let errorMsg = en
        ? 'Incorrect username / email or password.'
        : 'Tên người dùng / Email hoặc mật khẩu không chính xác.';

      if (nextAttempts >= 20) {
        errorMsg = en
          ? `Account locked for 15 minutes due to 20 failed attempts. Please reset your password.`
          : `Tài khoản đã bị tạm khóa 15 phút do nhập sai 20 lần. Vui lòng đặt lại mật khẩu.`;
      } else if (nextAttempts >= 15) {
        errorMsg = en
          ? `Incorrect password (${nextAttempts} failed attempts). Please wait 2 minutes or reset your password.`
          : `Mật khẩu không đúng (đã sai ${nextAttempts} lần). Vui lòng đợi 2 phút hoặc đặt lại mật khẩu.`;
      } else if (nextAttempts >= 10) {
        errorMsg = en
          ? `Incorrect password (${nextAttempts} failed attempts). Please wait 30 seconds before retrying.`
          : `Mật khẩu không đúng (đã sai ${nextAttempts} lần). Vui lòng đợi 30 giây trước khi thử lại.`;
      }

      await logAudit(user?.id || null, 'LOGIN_FAILED', { reason: 'incorrect_password', input: loginInput, attempts: nextAttempts }, ip);

      return NextResponse.json(
        {
          error: errorMsg,
          failedAttempts: nextAttempts,
          remainingAttempts: Math.max(0, 10 - nextAttempts),
          retryAfterSec,
          suggestReset,
        },
        { status: retryAfterSec > 0 ? 429 : 401 }
      );
    }

    if (user.isBanned) {
      if (user.bannedUntil && user.bannedUntil <= new Date()) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isBanned: false, banReason: null, bannedUntil: null },
        });
        user.isBanned = false;
        user.banReason = null;
        user.bannedUntil = null;
      } else {
        await logAudit(user.id, 'LOGIN_FAILED', { reason: 'account_banned' }, ip);
        let durationMsg = '';
        if (user.bannedUntil) {
          const remainingMs = user.bannedUntil.getTime() - Date.now();
          const remDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
          const remHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          const timeStr = remDays > 0 ? `${remDays} ngày ${remHours} giờ` : `${Math.max(1, remHours)} giờ`;
          durationMsg = en
            ? ` Suspended until ${user.bannedUntil.toLocaleDateString()} (remaining: ${timeStr}).`
            : ` Thời hạn đình chỉ đến ${user.bannedUntil.toLocaleDateString('vi-VN')} (còn lại ${timeStr}).`;
        } else {
          durationMsg = en ? ' Suspended permanently.' : ' Thời hạn: Vĩnh viễn.';
        }
        return NextResponse.json(
          {
            error: en
              ? `Your account has been suspended.${durationMsg}${user.banReason ? ' Reason: ' + user.banReason : ''}`
              : `Tài khoản của bạn đã bị đình chỉ hoạt động.${durationMsg}${user.banReason ? ' Lý do: ' + user.banReason : ''}`,
          },
          { status: 403 }
        );
      }
    }

    // Check 2FA TOTP BEFORE resetting failed login attempts
    if (user.totpEnabled && user.totpSecret) {
      if (!totpToken) {
        return NextResponse.json({
          error: en ? 'Two-factor authentication required.' : 'Yêu cầu xác thực hai yếu tố.',
          requires2fa: true,
        }, { status: 403 });
      }

      const { authenticator } = await import('otplib');
      const isValidTotp = authenticator.check(String(totpToken).trim(), user.totpSecret);
      if (!isValidTotp) {
        const nextAttempts = (user.failedLoginAttempts || 0) + 1;
        let retryAfterSec = 0;
        let newLockedUntil: Date | null = null;
        if (nextAttempts >= 20) {
          retryAfterSec = 15 * 60;
          newLockedUntil = new Date(Date.now() + retryAfterSec * 1000);
        } else if (nextAttempts >= 15) {
          retryAfterSec = 120;
          newLockedUntil = new Date(Date.now() + retryAfterSec * 1000);
        } else if (nextAttempts >= 10) {
          retryAfterSec = 30;
          newLockedUntil = new Date(Date.now() + retryAfterSec * 1000);
        }
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: nextAttempts,
              lockedUntil: newLockedUntil,
              lastFailedLoginAt: new Date(),
            },
          });
        } catch (dbErr) {
          console.error('Failed to update 2FA login attempts:', dbErr);
        }
        await logAudit(user.id, 'LOGIN_FAILED', { reason: 'invalid_2fa', attempts: nextAttempts }, ip);
        return NextResponse.json({
          error: en ? 'Invalid 2FA code.' : 'Mã 2FA không hợp lệ.',
        }, { status: retryAfterSec > 0 ? 429 : 401 });
      }
    }

    // Reset failed login attempts on successful login (after password + 2FA)
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });
      } catch (e) {
        console.error('Failed to reset login attempts:', e);
      }
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      isSuperAdmin: isSuperAdminUser(user),
      avatarUrl: user.avatarUrl,
      discordTag: user.discordTag,
      gdUsername: user.gdUsername,
      gdVerified: user.gdVerified,
      classicPp: user.classicPp,
      platformerPp: user.platformerPp,
      creatorPoints: user.creatorPoints,
      spPoints: user.spPoints,
      supporterUntil: user.supporterUntil,
      nameColor: user.nameColor,
      nameGradient: user.nameGradient,
      nameGlow: user.nameGlow,
      nameFont: user.nameFont,
      hasGlitchTheme: user.hasGlitchTheme,
      easterEggCompleted: user.easterEggCompleted,
      clanMember: user.clanMember
        ? {
            role: user.clanMember.role,
            clan: sanitizeUserClan(user.clanMember.clan),
          }
        : null,
    };

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    await setAuthCookie(token);

    await logAudit(user.id, 'LOGIN_SUCCESS', { method: 'password' }, ip);

    return NextResponse.json({ success: true, user: safeUser });

  } catch (error) {
    return publicApiError(error, 'Server error.');
  }
}
