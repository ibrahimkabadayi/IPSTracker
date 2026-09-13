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

export function banIpInstantly(ip, reason = 'HoneyToken bait triggered.') {
    const record = getAttemptData(ip) || { requestCount: 1, scannedPorts: new Set() };

    addToBlacklist({
        ip: ip,
        requestCount: record.requestCount || 1,
        set: record.scannedPorts || new Set(),
        reason: reason
    });

    console.log(`🚫 [INSTANT BAN] IP: ${ip} added to the blacklist! Reason: ${reason}`);
}