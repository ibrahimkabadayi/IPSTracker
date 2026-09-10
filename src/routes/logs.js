import express from 'express';
import {debugCacheSnapshot} from "../cache/cacheService.js";

const router = express.Router();

router.get('/cache-snapshot', (req, res) => {
    res.json(debugCacheSnapshot());
});

export default router;