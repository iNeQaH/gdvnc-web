const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Backfilling supporter totals...');
  // 1. Scan audit logs for SEPAY_WEBHOOK
  const logs = await prisma.auditLog.findMany({
    where: { action: 'SEPAY_WEBHOOK' },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Found ${logs.length} SEPAY_WEBHOOK audit logs.`);

  const userTotals = new Map();
  for (const log of logs) {
    const userId = log.targetId || log.userId;
    if (!userId) continue;
    const details = log.details || {};
    const amount = Number(details.transferAmount) || 0;
    const months = Number(details.monthsGranted) || 1;
    const date = log.createdAt;

    const curr = userTotals.get(userId) || { amount: 0, months: 0, lastDate: date };
    curr.amount += amount;
    curr.months += months;
    if (new Date(date) > new Date(curr.lastDate)) {
      curr.lastDate = date;
    }
    userTotals.set(userId, curr);
  }

  for (const [userId, val] of userTotals.entries()) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        supporterTotalAmount: val.amount,
        supporterTotalMonths: val.months,
        lastSupportedAt: val.lastDate,
      },
    }).catch(e => console.warn(`Could not update user ${userId}:`, e.message));
  }

  // 2. Also check users who currently have supporterUntil > now but no total
  const now = new Date();
  const currentSupporters = await prisma.user.findMany({
    where: {
      supporterUntil: { gt: now },
      supporterTotalMonths: 0,
    },
  });
  console.log(`Found ${currentSupporters.length} active supporters without audit logs.`);
  for (const u of currentSupporters) {
    const diffDays = Math.max(1, Math.ceil((u.supporterUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const estMonths = Math.max(1, Math.ceil(diffDays / 30));
    await prisma.user.update({
      where: { id: u.id },
      data: {
        supporterTotalMonths: estMonths,
        supporterTotalAmount: estMonths * 20000,
        lastSupportedAt: u.supporterUntil,
      },
    });
  }

  console.log('Backfill complete!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
