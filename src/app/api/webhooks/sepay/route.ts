import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { calculateSupportPrice, detectMonthsFromAmount } from '@/lib/supportPayment';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';

function verifySePayAuth(req: Request, rawBody: string, secret: string): boolean {
  if (!secret) return false;

  // 1. Check Authorization header: Apikey <secret> or Bearer <secret>
  const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key') || '';
  if (authHeader) {
    const token = authHeader.replace(/^(Apikey|Bearer)\s+/i, '').trim();
    const cleanSecret = secret.replace(/^whsec_/, '');
    const tokenBuf = Buffer.from(token);
    const secretBuf = Buffer.from(secret);
    const cleanSecretBuf = Buffer.from(cleanSecret);

    if (tokenBuf.length > 0 && tokenBuf.length === secretBuf.length && crypto.timingSafeEqual(tokenBuf, secretBuf)) {
      return true;
    }
    if (tokenBuf.length > 0 && tokenBuf.length === cleanSecretBuf.length && crypto.timingSafeEqual(tokenBuf, cleanSecretBuf)) {
      return true;
    }
  }

  // 2. Check X-SePay-Signature header
  const signature = req.headers.get('x-sepay-signature');
  if (signature) {
    const cleanSig = signature.replace(/^sha256=/i, '').trim();
    const timestamp = req.headers.get('x-sepay-timestamp') || '';

    // Check timestamp freshness if provided (reject if older than 5 minutes)
    if (timestamp) {
      const tsNum = parseInt(timestamp, 10);
      if (Number.isFinite(tsNum)) {
        const diffMs = Math.abs(Date.now() - (tsNum > 1e11 ? tsNum : tsNum * 1000));
        if (diffMs > 5 * 60 * 1000) {
          console.warn('[SePay Webhook] Signature timestamp expired:', diffMs, 'ms');
          return false;
        }
      }
    }

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

  // 1. Extract explicit months: e.g. "SUPPORT 3T", "3T", "SUPPORT 3", "36T"
  const m1 = clean.match(/SUPPORT\s*(\d+)\s*T/);
  const m2 = clean.match(/\b(\d+)\s*T\b/);
  const m3 = clean.match(/SUPPORT\s*(\d+)\b/);
  if (m1) {
    monthsFromMemo = parseInt(m1[1], 10);
  } else if (m2) {
    monthsFromMemo = parseInt(m2[1], 10);
  } else if (m3) {
    monthsFromMemo = parseInt(m3[1], 10);
  }

  // 2. Pattern 1: GDVN <username> ... hoặc GDVN<username> dính liền
  // Tránh lazy match cắt mất đuôi username (ví dụ ABC12T bị cắt thành ABC)
  const gdvnMatch = clean.match(/(?:GDVN|SEVQRGDVN)\s*([A-Z0-9]+)(?:\s+SUPPORT|\s+\d+\s*T|\s|$)/);
  if (gdvnMatch && gdvnMatch[1] && gdvnMatch[1] !== 'SUPPORT') {
    candidates.push(gdvnMatch[1]);
  }

  // 3. Pattern 2: <username> SUPPORT ...
  const supportMatch = clean.match(/([A-Z0-9]+)\s+SUPPORT/);
  if (supportMatch && supportMatch[1] && supportMatch[1] !== 'GDVN') {
    if (!candidates.includes(supportMatch[1])) {
      candidates.push(supportMatch[1]);
    }
  }

  // 4. Nếu memo là chuỗi GDVN dính liền không có dấu cách: ví dụ "SEVQRGDVNVIK17"
  const rawPrefixMatch = clean.match(/(?:GDVN|SEVQRGDVN)([A-Z0-9]+)/);
  if (rawPrefixMatch && rawPrefixMatch[1]) {
    const rawVal = rawPrefixMatch[1];
    if (!candidates.includes(rawVal) && rawVal !== 'SUPPORT') {
      candidates.push(rawVal);
    }
  }

  // Tuyệt đối không fallback sang các từ ngẫu nhiên trong nội dung CK (tên người chuyển, ngân hàng...)
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

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const sepayTxId = body.id ? String(body.id) : body.referenceCode ? String(body.referenceCode) : null;
    const transferAmount = parseInt(body.transferAmount || body.amount || '0', 10) || 0;
    const transactionContent = String(body.content || body.transactionContent || body.description || '').toUpperCase();
    const transferType = String(body.transferType || '').toLowerCase();

    console.log('[SePay Webhook] Received:', {
      sepayTxId,
      transferAmount,
      transferType,
      transactionContent,
    });

    if (transferType && transferType !== 'in') {
      return NextResponse.json({ success: true, note: 'Ignore outbound transfer' });
    }

    // Require transaction ID to ensure idempotency
    if (!sepayTxId) {
      console.warn('[SePay Webhook] Missing transaction ID or referenceCode');
      return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 });
    }

    // Fast idempotency check before candidate lookup
    const existingTx = await prisma.sepayTransaction.findUnique({
      where: { sepayTxId },
      select: { id: true },
    });
    if (existingTx) {
      console.log(`[SePay Webhook] Duplicate transaction ${sepayTxId} ignored.`);
      return NextResponse.json({ success: true, note: 'Duplicate transaction already processed' });
    }

    const { candidates, monthsFromMemo } = parseTransactionMemo(transactionContent);

    // Find target user: ONLY match username (exact case-insensitive).
    let targetUser: any = null;
    let matchedCandidate = '';

    for (const cand of candidates) {
      const cleanCand = cand.replace(/[^A-Z0-9]/gi, '');
      const u = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: cand, mode: 'insensitive' as const } },
            ...(cleanCand.length >= 3 && cleanCand !== cand
              ? [{ username: { equals: cleanCand, mode: 'insensitive' as const } }]
              : []),
          ],
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

    // Determine months to grant strictly bounded by actual transferAmount
    const detectedFromPrice = detectMonthsFromAmount(transferAmount);
    let monthsToGrant = detectedFromPrice;
    if (monthsFromMemo > 0 && monthsFromMemo <= 120) {
      const expectedTotal = calculateSupportPrice(monthsFromMemo).totalPrice;
      if (transferAmount >= expectedTotal) {
        monthsToGrant = Math.max(monthsFromMemo, detectedFromPrice);
      }
    }

    if (monthsToGrant <= 0) {
      console.log(`[SePay Webhook] Amount ${transferAmount} too small to grant any supporter months.`);
      return NextResponse.json({ success: true, note: 'Amount too small' });
    }

    const now = new Date();
    const currentSupporter = targetUser.supporterUntil;
    const baseDate = currentSupporter && currentSupporter > now ? currentSupporter : now;
    const nextDate = new Date(baseDate.getTime() + monthsToGrant * 30 * 24 * 60 * 60 * 1000);

    const bonusSpCoins = Math.floor(monthsToGrant / 3) * 2;
    const bonusMsg = bonusSpCoins > 0
      ? ` Đồng thời bạn được tặng thêm +${bonusSpCoins} điểm SP Coin duy trì Clan (thời hạn đến ngày ${nextDate.toLocaleDateString('vi-VN')}).`
      : '';

    // Atomic write inside transaction: SepayTransaction (unique) + User + Grants + Notification + AuditLog
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Record transaction with UNIQUE constraint (prevents duplicate execution)
        await tx.sepayTransaction.create({
          data: {
            sepayTxId,
            transferAmount,
            userId: targetUser.id,
            content: transactionContent,
          },
        });

        // 2. Update user supporter fields
        await tx.user.update({
          where: { id: targetUser.id },
          data: {
            supporterUntil: nextDate,
            supporterTotalMonths: { increment: monthsToGrant },
            supporterTotalAmount: { increment: transferAmount },
            lastSupportedAt: now,
          },
        });

        // 3. Synchronize SP Grants expiry to match supporter expiry
        await tx.userSpGrant.updateMany({
          where: { userId: targetUser.id },
          data: { expiresAt: nextDate },
        });

        // 4. Create bonus SP grant if eligible
        if (bonusSpCoins > 0) {
          await tx.userSpGrant.create({
            data: {
              userId: targetUser.id,
              amount: bonusSpCoins,
              expiresAt: nextDate,
              reason: `SUPPORT_${monthsToGrant}M_BONUS`,
            },
          });
        }

        // 5. In-app notification
        await tx.notification.create({
          data: {
            userId: targetUser.id,
            title: 'Quyên góp thành công',
            message: `Hệ thống đã nhận được ${transferAmount.toLocaleString('vi-VN')}đ. Tài khoản của bạn được cấp ${monthsToGrant} tháng danh hiệu Supporter.${bonusMsg} Cảm ơn bạn đã đồng hành và ủng hộ GDVN!`,
          },
        });

        // 6. Audit log within transaction
        await tx.auditLog.create({
          data: {
            userId: targetUser.id,
            action: 'SEPAY_WEBHOOK',
            details: {
              sepayTxId,
              transferAmount,
              monthsGranted: monthsToGrant,
              bonusSpCoins,
              transactionContent,
            },
            ipAddress: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || null,
          },
        });
      });
    } catch (txError: any) {
      if (txError?.code === 'P2002' || String(txError?.message).includes('Unique constraint')) {
        console.log(`[SePay Webhook] Duplicate transaction ${sepayTxId} detected during transaction, ignored.`);
        return NextResponse.json({ success: true, note: 'Duplicate transaction already processed' });
      }
      throw txError;
    }

    bustPublicCache(CACHE_TAGS.leaderboard);

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
