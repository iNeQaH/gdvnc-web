import { Router } from 'express';
import leaderboardRouter from './leaderboard';
import siteLockRouter from './siteLock';
import levelsRouter from './levels';
import timelineRouter from './timeline';
import profileRouter from './profile';
import authRouter from './auth';

const router = Router();

router.use('/leaderboard', leaderboardRouter);
router.use('/site-lock', siteLockRouter);
router.use('/levels', levelsRouter);
router.use('/timeline', timelineRouter);
router.use('/profile', profileRouter);
router.use('/auth', authRouter);

export default router;
