import {getAttemptData} from "../cache/cacheService.js";
import {addToBlacklist} from "../db/database.js";
import * as dotenv from "dotenv";

dotenv.config();

const maxRequestCount = Number(process.env.REQUEST_THRESHOLD);
const maxPortScanCount =Number(process.env.PORT_SCAN_THRESHOLD);

export function analyzeThreatLevel(ip) {
    const record = getAttemptData(ip);

    let reason = '';
    let isThreat = false;

    if (record.requestCount > maxRequestCount) {
        reason = 'Exceeded max request count.';
        isThreat = true;
    }
    else if (record.scannedPorts.size > maxPortScanCount) {
        reason = 'Exceeded max port scan count.';
        isThreat = true;
    } else {
        if (!record) return { isThreat: false, reason: "" };
    }

    if (isThreat) {
        addToBlacklist(
            {
                ip: ip,
                requestCount: record.requestCount,
                set: record.scannedPorts,
                reason: reason
            });

        return {isThreat: true, reason: reason};
    } else {
        return {isThreat: false, reason: ""}
    }
}