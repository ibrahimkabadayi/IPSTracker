import express from 'express';
import {
    getOverview,
    getCredentials,
    getTopIps,
    getCommands,
    getBlacklist,
    getCacheSnapshot,
    getLogsList
} from '../controllers/logController.js';

const router = express.Router();

router.get('/stats/overview', getOverview);
router.get('/', getLogsList);
router.get('/stats/credentials', getCredentials);
router.get('/stats/top-ips', getTopIps);
router.get('/recent-commands', getCommands);
router.get('/blacklist', getBlacklist);
router.get('/cache-snapshot', getCacheSnapshot);

export default router;