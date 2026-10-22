import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { calculateUserSp } from '@/lib/clanTypes';
import { sendGlitchRewardEmail } from '@/lib/mail';
import { publicApiError } from '@/lib/apiError';
import { isSuperAdminUsername, isStaffRole } from '@/lib/roles';
import { isBrowserSameOriginFetch } from '@/lib/origin';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function isEasterEggOwner(user?: { role?: string | null; username?: string | null } | null) {
  if (!user?.username) return false;
  return isSuperAdminUsername(user.username) || user.username.toLowerCase() === 'ineqah';
}

function isEasterEggTester(user?: { role?: string | null; username?: string | null } | null) {
  if (!user) return false;
  if (isEasterEggOwner(user)) return true;
  if (isStaffRole(user.role)) return true;
  if (user.username?.toLowerCase() === 'ego') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

const WHEEL_VALUES = [-1, -2, 0, 1, 2, 3] as const;
const MAX_NATURAL_SPINS = 3;
const MAX_DAILY_EXCHANGE = 3;

function getVnNowParts(nowMs: number = Date.now()) {
  const vnMs = nowMs + 7 * 3600_000;
  // Every 2 hours aligned with 0h, 2h, 4h, ..., 22h Vietnam time
  const slotIndex = Math.floor(vnMs / (2 * 3600_000));
  const vnDate = new Date(vnMs);
  const yyyy = vnDate.getUTCFullYear();
  const mm = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(vnDate.getUTCDate()).padStart(2, '0');
  const todayVn = `${yyyy}-${mm}-${dd}`;
  const nextSlotMs = (slotIndex + 1) * (2 * 3600_000) - 7 * 3600_000;
  return { slotIndex, todayVn, nextSlotAt: new Date(nextSlotMs).toISOString() };
}

async function syncUserEasterEggState(userId: string) {
  const { slotIndex, todayVn, nextSlotAt } = getVnNowParts();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      supporterUntil: true,
      easterEggCompleted: true,
      easterEggPoints: true,
      easterEggCode: true,
      easterEggSpins: true,
      easterEggLastSlot: true,
      easterEggDailyCount: true,
      easterEggDailyDate: true,
      spGrants: {
        select: { id: true, amount: true, expiresAt: true },
      },
      clanSpContributed: {
        select: { id: true, spPledged: true, clanId: true },
      },
    },
  });

  if (!user) return null;

  const tester = isEasterEggTester(user);

  let spins = user.easterEggSpins;
  let lastSlot = user.easterEggLastSlot;
  let dailyCount = user.easterEggDailyCount;
  let dailyDate = user.easterEggDailyDate;
  let needsUpdate = false;

  if (tester) {
    if (spins < 9999) {
      spins = 9999;
      needsUpdate = true;
    }
  } else if (!lastSlot || lastSlot <= 0) {
    lastSlot = slotIndex;
    needsUpdate = true;
  } else if (slotIndex > lastSlot) {
    const gained = slotIndex - lastSlot;
    if (spins < MAX_NATURAL_SPINS) {
      spins = Math.min(MAX_NATURAL_SPINS, spins + gained);
    }
    lastSlot = slotIndex;
    needsUpdate = true;
  }

  if (dailyDate !== todayVn) {
    dailyDate = todayVn;
    dailyCount = 0;
    needsUpdate = true;
  }

  if (needsUpdate) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        easterEggSpins: spins,
        easterEggLastSlot: lastSlot,
        easterEggDailyCount: dailyCount,
        easterEggDailyDate: dailyDate,
      },
    });
  }

  const userSp = calculateUserSp(user);

  return {
    ...user,
    easterEggSpins: spins,
    easterEggLastSlot: lastSlot,
    easterEggDailyCount: dailyCount,
    easterEggDailyDate: dailyDate,
    userSp,
    nextSlotAt,
    slotIndex,
    todayVn,
  };
}

export async function GET() {
  try {
    const auth = await requireAuth();
    const state = await syncUserEasterEggState(auth.userId);
    if (!state) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const owner = isEasterEggOwner(state);
    const tester = owner || isEasterEggTester(state);

    let eggCode = state.easterEggCode;
    if (!eggCode && (state.easterEggCompleted || state.easterEggPoints >= 100)) {
      const codeRecord = await prisma.redeemCode.findFirst({
        where: { createdById: state.id, rewardType: 'GLITCH_THEME' },
        orderBy: { createdAt: 'desc' },
        select: { code: true },
      });
      if (codeRecord) {
        eggCode = codeRecord.code;
      }
    }

    if (eggCode || state.easterEggCompleted || state.easterEggPoints >= 100) {
      return NextResponse.json({
        completed: true,
        code: eggCode || null,
        points: state.easterEggPoints,
        spins: 0,
        isTester: tester,
        isOwner: owner,
      });
    }

    return NextResponse.json({
      completed: false,
      code: null,
      points: state.easterEggPoints,
      spins: tester ? 9999 : state.easterEggSpins,
      dailyCount: state.easterEggDailyCount,
      userSp: state.userSp,
      nextSlotAt: state.nextSlotAt,
      isTester: tester,
      isOwner: owner,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return publicApiError(error, 'Error', 500);
  }
}

export async function POST(req: Request) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
  }

  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`easter-egg:${auth.userId}`, 25, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    const state = await syncUserEasterEggState(auth.userId);
    if (!state) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const owner = isEasterEggOwner(state);
    const tester = owner || isEasterEggTester(state);
    const force100 = Boolean(body?.force100 && owner);

    if (action === 'reset' && tester) {
      await prisma.user.update({
        where: { id: state.id },
        data: {
          easterEggPoints: 0,
          easterEggSpins: 9999,
          easterEggCompleted: false,
          easterEggCode: null,
        },
      });
      return NextResponse.json({ success: true, points: 0, spins: 9999, completed: false, code: null });
    }

    let eggCode = state.easterEggCode;
    if (!eggCode && (state.easterEggCompleted || state.easterEggPoints >= 100)) {
      const codeRecord = await prisma.redeemCode.findFirst({
        where: { createdById: state.id, rewardType: 'GLITCH_THEME' },
        orderBy: { createdAt: 'desc' },
        select: { code: true },
      });
      if (codeRecord) {
        eggCode = codeRecord.code;
      }
    }

    if (eggCode || state.easterEggCompleted || state.easterEggPoints >= 100) {
      return NextResponse.json({ completed: true, code: eggCode }, { status: 403 });
    }

    if (action === 'spin') {
      if (state.easterEggSpins <= 0 && !tester) {
        return NextResponse.json({ error: 'NO_SPINS' }, { status: 400 });
      }

      const sliceIndex = crypto.randomInt(0, WHEEL_VALUES.length);
      const delta = force100 ? 100 : WHEEL_VALUES[sliceIndex];
      const nextPoints = force100 ? 100 : Math.max(0, Math.min(100, state.easterEggPoints + delta));
      const nextSpins = tester ? 9999 : state.easterEggSpins - 1;
      const reached100 = nextPoints >= 100;

      let generatedCode: string | null = null;

      await prisma.$transaction(async (tx) => {
        if (!tester) {
          const updated = await tx.user.updateMany({
            where: {
              id: state.id,
              easterEggCompleted: false,
              easterEggSpins: { gte: 1 },
            },
            data: {
              easterEggSpins: { decrement: 1 },
              easterEggPoints: nextPoints,
              easterEggLastSlot: state.slotIndex,
              ...(reached100 ? { easterEggCompleted: true, easterEggPoints: 100 } : {}),
            },
          });

          if (updated.count === 0) {
            throw new Error('NO_SPINS');
          }
        } else {
          await tx.user.update({
            where: { id: state.id },
            data: {
              easterEggSpins: 9999,
              easterEggPoints: nextPoints,
              easterEggLastSlot: state.slotIndex,
              ...(reached100 ? { easterEggCompleted: true, easterEggPoints: 100 } : {}),
            },
          });
        }

        if (reached100) {
          const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          let codeCandidate = '';
          for (let attempt = 0; attempt < 30; attempt++) {
            codeCandidate = '';
            for (let i = 0; i < 6; i++) {
              codeCandidate += chars[crypto.randomInt(0, chars.length)];
            }
            const existing = await tx.redeemCode.findUnique({
              where: { code: codeCandidate },
            });
            if (!existing) break;
          }
          generatedCode = codeCandidate;

          await tx.user.update({
            where: { id: state.id },
            data: {
              easterEggCode: generatedCode,
              easterEggCompleted: true,
              easterEggPoints: 100,
            },
          });

          await tx.redeemCode.create({
            data: {
              code: generatedCode,
              rewardType: 'GLITCH_THEME',
              months: 0,
              days: 0,
              spAmount: 0,
              maxUses: 1,
              isActive: true,
              createdById: state.id,
            },
          });

          await tx.notification.create({
            data: {
              userId: state.id,
              title: generatedCode,
              message: generatedCode,
            },
          });
        }
      });

      if (reached100 && generatedCode && state.email) {
        void sendGlitchRewardEmail(state.email, generatedCode);
      }

      return NextResponse.json({
        success: true,
        sliceIndex,
        delta,
        points: nextPoints,
        spins: nextSpins,
        completed: reached100,
        code: generatedCode || null,
      });
    }

    if (action === 'exchange') {
      if (state.easterEggDailyCount >= MAX_DAILY_EXCHANGE && !tester) {
        return NextResponse.json({ error: 'DAILY_LIMIT' }, { status: 400 });
      }
      if (state.userSp < 1 && !tester) {
        return NextResponse.json({ error: 'NO_SP' }, { status: 400 });
      }

      const expiresAt =
        state.supporterUntil && new Date(state.supporterUntil) > new Date()
          ? new Date(state.supporterUntil)
          : new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000);

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.updateMany({
          where: {
            id: state.id,
            easterEggCompleted: false,
            easterEggDailyCount: { lt: MAX_DAILY_EXCHANGE },
          },
          data: {
            easterEggSpins: { increment: 1 },
            easterEggDailyCount: { increment: 1 },
            easterEggDailyDate: state.todayVn,
          },
        });

        if (updated.count === 0) {
          throw new Error('DAILY_LIMIT');
        }

        await tx.userSpGrant.create({
          data: {
            userId: state.id,
            amount: -1,
            expiresAt,
            reason: 'EASTER_EGG_EXCHANGE',
          },
        });

        const nextUserSp = Math.max(0, state.userSp - 1);
        if (state.clanSpContributed && state.clanSpContributed.spPledged > nextUserSp) {
          await tx.clanSpContribution.update({
            where: { id: state.clanSpContributed.id },
            data: { spPledged: nextUserSp },
          });
        }

        const fresh = await tx.user.findUnique({
          where: { id: state.id },
          select: {
            easterEggPoints: true,
            easterEggSpins: true,
            easterEggDailyCount: true,
          },
        });

        return {
          points: fresh?.easterEggPoints ?? state.easterEggPoints,
          spins: fresh?.easterEggSpins ?? state.easterEggSpins + 1,
          dailyCount: fresh?.easterEggDailyCount ?? state.easterEggDailyCount + 1,
          userSp: nextUserSp,
        };
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error?.message === 'NO_SPINS' || error?.message === 'DAILY_LIMIT') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return publicApiError(error, 'Error', 500);
  }
}
