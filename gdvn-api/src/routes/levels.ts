import { Router } from 'express';
import prisma from '@/db/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';
import { compareListLevels } from '@/services/levelSort';
import { applyGdlisthubRanksToLevels } from '@/services/gdlisthubLists';
import { getCached, setCache } from '@/cache/redis';

const router = Router();

const dbLevelSelect = {
  id: true,
  gdLevelId: true,
  name: true,
  mode: true,
  difficulty: true,
  difficultyFace: true,
  ratingType: true,
  isVN: true,
  isChallenge: true,
  placement: true,
  vnPlacement: true,
  basePp: true,
  minPercent: true,
  creatorName: true,
  youtubeId: true,
  description: true,
  _count: { select: { records: { where: { status: RecordStatus.APPROVED } } } },
} as const;

function mapDbLevels(levels: Array<any>) {
  return levels.map(({ _count, ...rest }) => ({ ...rest, victorCount: _count.records }));
}

async function loadDbLevels(mode: string, tier: string | null, challenge: boolean) {
  const levels = await prisma.level.findMany({
    where: {
      isChallenge: challenge,
      ...(mode !== 'ALL' ? { mode: mode as LevelMode } : {}),
      ...(tier === 'main' ? { placement: { gte: 1, lte: 75 } }
        : tier === 'extended' ? { placement: { gte: 75, lte: 150 } }
        : tier === 'legacy' ? { OR: [{ placement: { gte: 151 } }, { placement: null }] }
        : {}),
    },
    select: dbLevelSelect,
  });
  const mapped = mapDbLevels(levels);
  if (challenge) return mapped.sort(compareListLevels);
  return applyGdlisthubRanksToLevels(mapped).sort(compareListLevels);
}

router.get('/', async (req, res) => {
  try {
    const mode = (req.query.mode as string) || 'CLASSIC';
    const tier = (req.query.tier as string) || null;
    const challenge = req.query.challenge === '1';
    
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    
    const cacheKey = `levels:${mode}:${tier}:${challenge}:${page}:${limit}`;
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      return res.json({ success: true, ...cached, source: 'cache' });
    }

    const allLevels = await loadDbLevels(mode, tier, challenge);
    
    const total = allLevels.length;
    const totalPages = Math.ceil(total / limit);
    const startIdx = (page - 1) * limit;
    const paginatedLevels = allLevels.slice(startIdx, startIdx + limit);
    
    const result = {
      levels: paginatedLevels,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
    
    await setCache(cacheKey, result, 600);
    
    return res.json({ success: true, ...result, source: 'database' });
  } catch (error: any) {
    console.error('Levels API error:', error);
    return res.status(500).json({ error: error.message || 'Lỗi truy xuất Levels List.' });
  }
});

export default router;
