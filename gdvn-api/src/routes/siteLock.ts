import { Router } from 'express';
import { isSiteLocked, setSiteLocked } from '@/services/siteLock';
import { isSuperAdminUsername } from '@/services/roles';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const locked = await isSiteLocked();
    res.json({ success: true, locked });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.patch('/', async (req, res) => {
  try {
    if (!req.user || !isSuperAdminUsername(req.user.username)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const { locked } = req.body;
    await setSiteLocked(!!locked);
    res.json({ success: true, locked: !!locked });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
