import {analyzeThreatLevel} from "../detector/threatSensor.js";
import {recordAttempt} from "../cache/cacheService.js";
import {isBlacklisted} from "./middlewares/trafficFilter.js";

export function handleConnection(io, ip, port) {
    if (isBlacklisted(ip)) {
        return;
    }

    recordAttempt(ip, port)

    const threatResult = analyzeThreatLevel(ip);
    if (threatResult.isThreat) {
        io.emit('newAlert', {ip, ...threatResult})
    }
}