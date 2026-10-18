import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { detectMonthsFromAmount } from '@/lib/supportPayment';

function verifySePayAuth(req: Request, rawBody: string, secret: string): boolean {
  if (!secret) return false;

  // 1. Check Authorization header: Apikey <secret> or Bearer <secret>
  const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key') || '';
  if (authHeader) {
    const token = authHeader.replace(/^(Apikey|Bearer)\s+/i, '').trim();
    if (token === secret || token === secret.replace(/^whsec_/, '')) {
      return true;
    }
  }

  // 2. Check X-SePay-Signature header
  const signature = req.headers.get('x-sepay-signature');
  if (signature) {
    const cleanSig = signature.replace(/^sha256=/i, '').trim();
    const timestamp = req.headers.get('x-sepay-timestamp') || '';

    const secrets = [secret, secret.replace(/^whsec_/, '')];
    const payloads = timestamp ? [`${timestamp}.${rawBody}`, rawBody] : [rawBody];

    for (const sec of secrets) {
      for (const payload of payloads) {
        try {
          const hmac = crypto.createHmac('sha256', sec);
          hmac.update(payload);
          const expected = hmac.digest('hex');

          const sigBuf = Buffer.from(cleanSig, 'hex');
          const expBuf = Buffer.from(expected, 'hex');
          if (sigBuf.length > 0 && sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
            return true;
          }
        } catch {
          // ignore hex parsing errors
        }
      }
    }
  }

  return false;
}

function parseTransactionMemo(content: string) {
  const clean = content.toUpperCase();
  const candidates: string[] = [];
  let monthsFromMemo = 0;

  // 1. Extract explicit months: e.g. "SUPPORT 3T", "3T", "SUPPORT 3"
  const m1 = clean.match(/SUPPORT\s*(\d{1,2})\s*T/);
  const m2 = clean.match(/\b(\d{1,2})\s*T\b/);
  const m3 = clean.match(/SUPPORT\s*(\d{1,2})\b/);
  if (m1) {
    monthsFromMemo = parseInt(m1[1], 10);
  } else if (m2) {
    monthsFromMemo = parseInt(m2[1], 10);
  } else if (m3) {
    monthsFromMemo = parseInt(m3[1], 10);
  }

  // 2. Pattern 1: GDVN <username> ...
  const gdvnMatch = clean.match(/GDVN\s+([A-Z0-9_.-]+)/);
  if (gdvnMatch && gdvnMatch[1] && gdvnMatch[1] !== 'SUPPORT') {
    candidates.push(gdvnMatch[1]);
  }

  // 3. Pattern 2: <username> SUPPORT ...
  const supportMatch = clean.match(/([A-Z0-9_.-]+)\s+SUPPORT/);
  if (supportMatch && supportMatch[1] && supportMatch[1] !== 'GDVN') {
    candidates.push(supportMatch[1]);
  }

  // 4. Token fallback: split by non-word and collect likely usernames
  const stopWords = new Set([
    'GDVN', 'SUPPORT', 'UNG', 'HO', 'THANH', 'TOAN', 'CHUYEN', 'KHOAN', 'NAP', 'TIEN',
    'VIETINBANK', 'TECHCOMBANK', 'MBBANK', 'MBVCB', 'VCB', 'ACB', 'BIDV', 'ICB', 'IBFT',
    'NAPAS', 'QR', 'VNPAY', 'MOMO', 'ZALOPAY', 'TRANSFER', 'FROM', 'TO', 'THE'
  ]);
  const tokens = clean
    .split(/[^A-Z0-9_.-]+/)
    .filter((t) => t.length >= 3 && t.length <= 25 && !stopWords.has(t) && !/^\d+$/.test(t) && !/^\d+T$/.test(t));

  for (const t of tokens) {
    if (!candidates.includes(t)) {
      candidates.push(t);
    }
  }

  return { candidates, monthsFromMemo };
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const secret = process.env.SEPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('SePay Webhook Error: SEPAY_WEBHOOK_SECRET is not configured on server.');
      return NextResponse.json({ error: 'Webhook secret not configured on server' }, { status: 500 });
    }

    const isAuthorized = verifySePayAuth(req, rawBody, secret);
    if (!isAuthorized) {
      console.warn('[SePay Webhook] Authentication failed. Headers:', {
        auth: req.headers.get('authorization'),
        signature: req.headers.get('x-sepay-signature'),
        timestamp: req.headers.get('x-sepay-timestamp'),
      });
      return NextResponse.json({ error: 'Invalid authentication or signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const transferAmount = parseInt(body.transferAmount || body.amount || '0', 10) || 0;
    const transactionContent = String(body.content || body.transactionContent || body.description || '').toUpperCase();
    const transferType = String(body.transferType || '').toLowerCase();

    console.log('[SePay Webhook] Received:', {
      transferAmount,
      transferType,
      transactionContent,
    });

    if (transferType && transferType !== 'in') {
      return NextResponse.json({ success: true, note: 'Ignore outbound transfer' });
    }

    const { candidates, monthsFromMemo } = parseTransactionMemo(transactionContent);

    // Find target user from candidate usernames
    let targetUser: any = null;
    let matchedCandidate = '';
    for (const cand of candidates) {
      const u = await prisma.user.findFirst({
        where: {
          username: { equals: cand, mode: 'insensitive' },
        },
      });
      if (u) {
        targetUser = u;
        matchedCandidate = cand;
        break;
      }
    }

    if (!targetUser) {
      console.warn('[SePay Webhook] User not found for candidates:', candidates, 'in content:', transactionContent);
      return NextResponse.json({ success: true, note: 'User not found', checkedCandidates: candidates });
    }

    // Determine months to grant
    const detectedFromPrice = detectMonthsFromAmount(transferAmount);
    let monthsToGrant = monthsFromMemo > 0 ? Math.max(monthsFromMemo, detectedFromPrice) : detectedFromPrice;

    if (monthsToGrant <= 0) {
      console.log(`[SePay Webhook] Amount ${transferAmount} too small to grant any supporter months.`);
      return NextResponse.json({ success: true, note: 'Amount too small' });
    }

    const now = new Date();
    const currentSupporter = targetUser.supporterUntil;
    const baseDate = currentSupporter && currentSupporter > now ? currentSupporter : now;
    const nextDate = new Date(baseDate.getTime() + monthsToGrant * 30 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { supporterUntil: nextDate },
    });

    const bonusSpCoins = Math.floor(monthsToGrant / 3) * 2;
    if (bonusSpCoins > 0) {
      await prisma.userSpGrant.create({
        data: {
          userId: targetUser.id,
          amount: bonusSpCoins,
          expiresAt: nextDate,
          reason: `SUPPORT_${monthsToGrant}M_BONUS`,
        },
      });
    }

    const bonusMsg = bonusSpCoins > 0
      ? ` Đồng thời bạn được tặng thêm +${bonusSpCoins} điểm SP Coin duy trì Clan (thời hạn đến ngày ${nextDate.toLocaleDateString('vi-VN')}).`
      : '';

    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        title: 'Quyên góp thành công',
        message: `Hệ thống đã nhận được ${transferAmount.toLocaleString('vi-VN')}đ. Tài khoản của bạn được cấp ${monthsToGrant} tháng danh hiệu Supporter.${bonusMsg} Cảm ơn bạn đã đồng hành và ủng hộ GDVN!`,
      },
    });

    console.log(`[SePay Webhook] Granted ${monthsToGrant} months (+${bonusSpCoins} SP) to ${targetUser.username} (matched '${matchedCandidate}'). Next expiry: ${nextDate.toISOString()}`);

    return NextResponse.json({
      success: true,
      user: targetUser.username,
      monthsAdded: monthsToGrant,
      bonusSpAdded: bonusSpCoins,
      supporterUntil: nextDate.toISOString(),
    });

  } catch (error) {
    console.error('SePay Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

