import { Router } from 'express';
import { rlmController } from '../controllers/rlmController';

const router = Router();

// RLM REST API endpoints for FreeRADIUS
router.post('/authorize', rlmController.authorize);
router.post('/authenticate', rlmController.authenticate);
router.post('/preacct', rlmController.preAccounting);
router.post('/accounting', rlmController.accounting);
router.post('/checksimul', rlmController.checkSimultaneous);
router.post('/postauth', rlmController.postAuth);

export default router;