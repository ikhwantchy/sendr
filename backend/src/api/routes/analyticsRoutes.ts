import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
    res.json({ success: true, data: {}, message: 'Analytics routes - implement as needed' });
});

export default router;
