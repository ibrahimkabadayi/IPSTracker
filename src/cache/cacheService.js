import NodeCache from 'node-cache';
import * as dotenv from "dotenv";

dotenv.config();

const TTL = Number(process.env.TTL) || 60;
const WINDOW_MS = TTL * 1000;

export const cache = new NodeCache({
    stdTTL: TTL * 2,
    checkerboard: Math.max(Math.floor(TTL / 2), 10),
    useClones: false
});

export function recordAttempt(ip, port) {
    const now = Date.now();
    const thresholdTime = now - WINDOW_MS;

    const record = cache.get(ip) || { requests: [] };

    const activeRequests = record.requests.filter(item => item.timestamp > thresholdTime);

    activeRequests.push({
        timestamp: now,
        port: port
    });

    cache.set(ip, { requests: activeRequests }, TTL * 2);
}

export function getAttemptData(ip) {
    const record = cache.get(ip);
    if (!record || !record.requests || record.requests.length === 0) {
        return null;
    }

    const now = Date.now();
    const thresholdTime = now - WINDOW_MS;

    const validRequests = record.requests.filter(item => item.timestamp > thresholdTime);

    if (validRequests.length === 0) {
        return null;
    }

    const scannedPorts = new Set(validRequests.map(item => item.port));

    return {
        requestCount: validRequests.length,
        scannedPorts: scannedPorts
    };
}

export function debugCacheSnapshot() {
    const keys = cache.keys();
    console.log("Keys:", keys);
    const snapshot = {};
    keys.forEach((key) => {
        snapshot[key] = cache.get(key);
    });
    return snapshot;
}