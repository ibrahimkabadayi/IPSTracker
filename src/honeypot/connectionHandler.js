import { analyzeThreatLevel } from "../detector/threatSensor.js";
import { recordAttempt } from "../cache/cacheService.js";
import { isBlacklisted } from "./middlewares/trafficFilter.js";

export function handleConnection(io, ip, port) {
    if (isBlacklisted(ip)) {
        console.log(`[BLACKLIST DROP] IP: ${ip} dropped.`);
        return false;
    }

    recordAttempt(ip, port);

    const threatResult = analyzeThreatLevel(ip);
    if (threatResult.isThreat) {
        console.log(`[THREAT DETECTED] IP: ${ip} -> ${threatResult.reason}`);
        io.emit('newAlert', { ip, ...threatResult });

        return false;
    }

    return true;
}