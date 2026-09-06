import NodeCache from 'node-cache';
import * as dotenv from "dotenv";

dotenv.config();

const TTL = Number(process.env.TTL) || 60;

const cache = new NodeCache({
    stdTTL: TTL,
});

export function recordAttempt(ip, port) {
    const record = cache.get(ip) || { requestCount: 0, scannedPorts: new Set() };
    record.requestCount++;
    record.scannedPorts.add(port);
    cache.set(ip, record);
}

export function getAttemptData(ip) {
    return cache.get(ip);
}
