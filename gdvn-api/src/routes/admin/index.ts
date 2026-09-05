import { Router } from 'express';
import recordsRouter from './records';
import usersRouter from './users';
import worksRouter from './works';

const router = Router();

router.use('/records', recordsRouter);
router.use('/users', usersRouter);
router.use('/works', worksRouter);

export default router;
