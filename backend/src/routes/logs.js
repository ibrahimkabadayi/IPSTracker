import express from 'express';
import {
    getOverview,
    getCredentials,
    getTopIps,
    getCommands,
    getCacheSnapshot,
    getLogsList,
    getBlacklistLogs,
    removeIpFromBlacklist,
    exportIocAsJson,
    exportIocAsCsv
} from '../controllers/logController.js';

const router = express.Router();

router.get('/stats/overview', getOverview);
router.get('/', getLogsList);
router.get('/stats/credentials', getCredentials);
router.get('/stats/top-ips', getTopIps);
router.get('/recent-commands', getCommands);
router.get('/cache-snapshot', getCacheSnapshot);
router.get('/blacklist', getBlacklistLogs);
router.get('/export/ioc/json', exportIocAsJson);
router.get('/export/ioc/csv', exportIocAsCsv);

router.delete('/blacklist/:ip', removeIpFromBlacklist);

export default router;