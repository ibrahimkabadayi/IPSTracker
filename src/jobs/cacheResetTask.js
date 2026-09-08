import { cache } from '../cache/cacheService.js';

export function startCacheMaintenanceTask() {
    setInterval(() => {
        const stats = cache.getStats();
        console.log(`[CACHE MAINTENANCE] Active IP Number: ${stats.keys}, Cache Hit: ${stats.hits}`);

    }, 60 * 60 * 1000); // 1 saat
}