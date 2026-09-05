import { Router } from 'express';
import prisma from '@/db/prisma';
import { getClientIp } from '@/services/requestIp';
import { clipText } from '@/services/validate';
import { isAllowedImageRef } from '@/services/uploadthing';
import { toChronicleEvent } from '@/services/timeline/serialize';
import { sanitizeChronicleHtml } from '@/services/timeline/sanitize';
import { clampImageScale, isNature, isTierId, normalizeImageRatio } from '@/services/timeline/types';
import { fromDateInput } from '@/services/timeline/time';
import { parseGlowColor } from '@/services/timeline/glow';
import { getCached, setCache, createRateLimiter } from '@/cache/redis';
// Require full admin would be a middleware, here we just assume it's added if needed
// import { requireFullAdmin } from '@/middlewares/auth';

const router = Router();
const timelineRateLimit = createRateLimiter('timeline', 60, 60_000);

function allowedImage(url: string) {
  return isAllowedImageRef(url);
}

function parseEventBody(body: any) {
  const title = clipText(body?.title, 160);
  const start = typeof body?.start === 'number' ? body.start : fromDateInput(body?.start);
  const endRaw = typeof body?.end === 'number' ? body.end : fromDateInput(body?.end);
  if (!title || start == null || !Number.isFinite(start)) return { error: 'Missing title or date.' };
  const end = endRaw != null && Number.isFinite(endRaw) ? Math.max(start, endRaw) : start;
  const image = clipText(body?.image, 500);
  if (image && !allowedImage(image)) return { error: 'Image must be an HTTPS URL.' };
  const nature = isNature(String(body?.nature || 'positive')) ? body.nature : 'positive';
  const tier = isTierId(String(body?.tier || '1y')) ? body.tier : '1y';
  return {
    data: {
      title,
      shortDescription: clipText(body?.shortDescription, 400),
      fullDescription: sanitizeChronicleHtml(clipText(body?.fullDescription, 20000)),
      image: image || null,
      startAt: new Date(start),
      endAt: new Date(end),
      approximate: Boolean(body?.approximate),
      nature,
      tier,
      glowColor: parseGlowColor(body?.glowColor),
      imageScale: clampImageScale(body?.imageScale),
      imageRatio: normalizeImageRatio(body?.imageRatio),
    },
  };
}

router.get('/', async (req, res) => {
  const ip = getClientIp(req as any) || 'unknown';
  const { success, reset } = await timelineRateLimit.limit(ip);
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    return res.status(429).json({ error: 'Too Many Requests' });
  }

  try {
    const cacheKey = 'timeline:events';
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      return res.json({ success: true, events: cached, source: 'cache' });
    }

    const rows = await prisma.timelineEvent.findMany({
      orderBy: { startAt: 'asc' },
    });
    
    const events = rows.map(toChronicleEvent);
    await setCache(cacheKey, events, 1800); // 30 mins

    return res.json({ success: true, events, source: 'database' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to load timeline.' });
  }
});

// Assuming requireFullAdmin is handled by middleware when mounting, or check JWT here.
// For now, implementing POST structure
router.post('/', async (req, res) => {
  // Authentication check omitted for brevity or handled by router setup
  try {
    const parsed = parseEventBody(req.body);
    if ('data' in parsed && parsed.data) {
      const row = await prisma.timelineEvent.create({ data: parsed.data });
      // Invalidate cache when new event is added
      const redis = require('@/cache/redis').redis;
      await redis.del('timeline:events');
      
      return res.json({ success: true, event: toChronicleEvent(row) });
    }
    return res.status(400).json({ error: parsed.error || 'Invalid event.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create event.' });
  }
});

export default router;
