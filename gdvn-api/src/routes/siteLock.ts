import { Router } from 'express';
import { isSiteLocked, setSiteLocked } from '@/services/siteLock';
import { isSuperAdminUsername } from '@/services/roles';
<<<<<<< HEAD
import { requireAuth } from '../middleware/auth';
=======
>>>>>>> dab22fbfaa8e48644f2f9a185b3b8d57156ab194

const router = Router();

router.get('/', async (req, res) => {
  try {
    const locked = await isSiteLocked();
    res.json({ success: true, locked });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

<<<<<<< HEAD
router.patch('/', requireAuth, async (req: any, res: any) => {
=======
router.patch('/', async (req, res) => {
>>>>>>> dab22fbfaa8e48644f2f9a185b3b8d57156ab194
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
