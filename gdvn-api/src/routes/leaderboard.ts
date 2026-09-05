import { Router } from 'express';
import { getPlayerLeaderboard, getCreatorLeaderboard, getCachedLeaderboard, setCachedLeaderboard } from '@/services/leaderboard';
import prisma from '@/db/prisma';
import { LevelMode } from '@prisma/client';

const router = Router();

router.get('/', async (req, res) => {
  const mode = req.query.mode === 'PLATFORMER' ? 'PLATFORMER' : 'CLASSIC';
  
  try {
    const cached = await getCachedLeaderboard(mode);
    if (cached) return res.json({ success: true, leaderboard: cached });

    const data = await getPlayerLeaderboard(mode as 'CLASSIC' | 'PLATFORMER');
    await setCachedLeaderboard(mode, data);
    return res.json({ success: true, leaderboard: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/highlights', async (req, res) => {
  try {
    const cached = await getCachedLeaderboard('highlights');
    if (cached) return res.json(cached);

    const [classicTop1, platformerTop1, creatorTop1, classicLevel, platformerLevel] = await Promise.all([
      getPlayerLeaderboard('CLASSIC').then(lb => lb[0] || null),
      getPlayerLeaderboard('PLATFORMER').then(lb => lb[0] || null),
      getCreatorLeaderboard().then(lb => lb[0] || null),
      prisma.level.findFirst({ where: { mode: LevelMode.CLASSIC, isVN: true }, orderBy: { vnPlacement: 'asc' } }),
      prisma.level.findFirst({ where: { mode: LevelMode.PLATFORMER, isVN: true }, orderBy: { vnPlacement: 'asc' } }),
    ]);

    const data = {
      success: true,
      data: { classicTop1, platformerTop1, creatorTop1, top1ClassicLevel: classicLevel, top1PlatformerLevel: platformerLevel }
    };
    
    await setCachedLeaderboard('highlights', data);
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
