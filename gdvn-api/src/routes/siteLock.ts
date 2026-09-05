import { Router } from 'express';
import { isSiteLocked, setSiteLocked } from '@/services/siteLock';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const locked = await isSiteLocked();
    res.json({ success: true, locked });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
