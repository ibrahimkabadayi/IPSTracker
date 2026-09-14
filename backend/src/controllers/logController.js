import { debugCacheSnapshot } from "../cache/cacheService.js";
import {
    getOverviewStats,
    getTopCredentials,
    getTopAttackerIps,
    getRecentCommands,
    getAllLogs,
    getBlacklistedIps,
    removeBlacklistIp,
    getIocData
} from "../db/database.js";

export const getOverview = (req, res) => {
    try {
        const stats = getOverviewStats();
        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const getCredentials = (req, res) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const creds = getTopCredentials(limit);
        res.json({ success: true, data: creds });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const getTopIps = (req, res) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const ips = getTopAttackerIps(limit);
        res.json({ success: true, data: ips });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const getCommands = (req, res) => {
    try {
        const limit = Number(req.query.limit) || 25;
        const commands = getRecentCommands(limit);
        res.json({ success: true, data: commands });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const getCacheSnapshot = (req, res) => {
    res.json(debugCacheSnapshot());
};

export const getLogsList = (req, res) => {
    try{
        const allLogs = getAllLogs();
        res.json(allLogs);
    } catch(err){
       res.status(500).json({ success: false, error: err.message });
    }
}

export const getBlacklistLogs = (req, res) => {
    try{
        const blacklist = getBlacklistedIps();
        res.status(200).json({ success: true, data: blacklist });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

export const removeIpFromBlacklist = (req, res) => {
    try {
        const { ip } = req.params;
        const result = removeBlacklistIp(ip);

        if (result.changes > 0) {
            res.status(200).json({ success: true, message: `IP ${ip} is removed successfully.` });
        } else {
            res.status(404).json({ success: false, message: `IP ${ip} not found` });
        }
    } catch(err){
        res.status(500).json({ success: false, error: err.message });
    }
}

export const exportIocAsJson = (req, res) => {
    try {
        const data = getIocData();
        res.setHeader('Content-Disposition', 'attachment; filename="honeypot-ioc-report.json"');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(JSON.stringify(data, null, 2));
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

export const exportIocAsCsv = (req, res) => {
    try {
        const data = getIocData();

        const headers = 'Type,Indicator,ThreatLevel,Reason,RequestCount,TargetPorts,BannedDate\n';

        const rows = data.indicators.map(i => {
            const cleanReason = (i.reason || '').replace(/"/g, '""');

            let cleanPorts = '';
            if (i.scanned_ports) {
                try {
                    const parsed = JSON.parse(i.scanned_ports);
                    cleanPorts = Array.isArray(parsed) ? parsed.join(';') : String(parsed);
                } catch {
                    cleanPorts = String(i.scanned_ports).replace(/[\[\]"']/g, '').replace(/,/g, ';');
                }
            }

            return `"${i.type}","${i.value}","${i.threat_level}","${cleanReason}","${i.request_count}","${cleanPorts}","${i.first_banned}"`;
        }).join('\n');

        res.setHeader('Content-Disposition', 'attachment; filename="honeypot-threat-indicators.csv"');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        return res.status(200).send(headers + rows);
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}