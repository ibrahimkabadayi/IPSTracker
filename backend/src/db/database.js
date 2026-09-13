import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'network.db');
const db = new Database(dbPath);

export const initDb = async () => {
    await db.exec(`PRAGMA foreign_keys = ON;`)

    await db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_ip TEXT NOT NULL,
            source_port INTEGER NOT NULL,
            target_port INTEGER NOT NULL,
            protocol TEXT NOT NULL,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
            ended_at DATETIME
        );
        CREATE TABLE IF NOT EXISTS http_details (
            log_id INTEGER NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
            method TEXT NOT NULL,
            headers JSON NOT NULL,
            body_payload JSON NULL,
            url TEXT NOT NULL,
            response_status INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ssh_details (
            log_id INTEGER NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
            attempted_username TEXT NOT NULL,
            attempted_password TEXT,
            client_version TEXT,
            method TEXT,
            public_key_fingerprint TEXT,
            commands_executed JSON,
            raw_payload JSON NOT NULL
        );
        CREATE TABLE IF NOT EXISTS telnet_details (
            log_id INTEGER NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
            attempted_username TEXT NOT NULL,
            attempted_password  TEXT NOT NULL,
            commands_executed TEXT,
            raw_payload JSON NOT NULL
        );
        CREATE TABLE IF NOT EXISTS blacklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT NOT NULL UNIQUE,
            request_count INTEGER NOT NULL,
            scanned_ports TEXT NOT NULL,
            scanned_port_count INTEGER NOT NULL,
            reason TEXT,
            is_threat INTEGER DEFAULT 1,
            banned_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL        
        );
    `);

    console.log('Database initialized.');
}

const insertLog = ({sourceIp, sourcePort, targetPort, protocol, isInstant = false}) => {
    const prepareLogTable = db.prepare(`
        INSERT INTO logs (source_ip, source_port, target_port, protocol, ended_at)
        VALUES (@sourceIp, @sourcePort, @targetPort, @protocol, ${isInstant ? 'CURRENT_TIMESTAMP' : 'NULL'});
    `);

    const result = prepareLogTable.run({
        sourceIp,
        sourcePort,
        targetPort,
        protocol
    });

    return result.lastInsertRowid;
};

export const closeLogSession = (logId) => {
    if (!logId) return;
    const query = db.prepare(`
        UPDATE logs 
        SET ended_at = CURRENT_TIMESTAMP 
        WHERE id = ?;
    `);
    return query.run(logId);
};

export const addTelnetLog = ({sourceIp, sourcePort, targetPort, attemptedUsername, attemptedPassword, commandsExecuted, rawPayload}) => {
    const id = insertLog({sourceIp, sourcePort, targetPort, protocol: 'telnet'});

    const query = db.prepare(`
        INSERT INTO telnet_details (log_id, attempted_username, attempted_password, commands_executed, raw_payload) 
        VALUES (@id, @attemptedUsername, @attemptedPassword, @commandsExecuted, @rawPayload);
    `);

    query.run({
        id,
        attemptedUsername,
        attemptedPassword,
        commandsExecuted,
        rawPayload
    });

    return id;
};

export const addHttpLog = ({sourceIp, sourcePort, targetPort, method, headers, bodyPayload, url, responseStatus}) => {
    const id = insertLog({
        sourceIp,
        sourcePort,
        targetPort,
        protocol: 'http',
        isInstant: true
    });

    const query = db.prepare(`
        INSERT INTO http_details (log_id, method, headers, body_payload, url, response_status)
        VALUES (@id, @method, @headers, @bodyPayload, @url, @responseStatus)
    `);

    return query.run({
        id,
        method,
        headers,
        bodyPayload,
        url,
        responseStatus
    });
};

export const addSshLog = ({sourceIp, sourcePort, targetPort, attemptedUsername, attemptedPassword, clientVersion, method, publicKeyFingerprint, rawPayload, commandsExecuted, isInstant = false}) => {
    const id = insertLog({sourceIp, sourcePort, targetPort, protocol: 'ssh', isInstant});

    const prepareSshTable = db.prepare(`
        INSERT INTO ssh_details (log_id, attempted_username, attempted_password, client_version, method, public_key_fingerprint, raw_payload, commands_executed)
        VALUES (@id, @attemptedUsername, @attemptedPassword, @clientVersion, @method, @publicKeyFingerprint, @rawPayload, @commandsExecuted);
    `);

    prepareSshTable.run({
        id,
        attemptedUsername,
        attemptedPassword,
        clientVersion,
        method,
        publicKeyFingerprint,
        rawPayload: rawPayload ? JSON.stringify(rawPayload) : JSON.stringify({}),
        commandsExecuted: commandsExecuted ? JSON.stringify(commandsExecuted) : JSON.stringify({})
    });

    return id;
};

export const getAllLogs = () => {
    const query = db.prepare(`
        SELECT * FROM logs,
        ROUND((julianday(ended_at) - julianday(started_at)) * 86400) AS session_duration_seconds
        ORDER BY started_at DESC
    `);

    return query.all();
};

export const addToBlacklist = ({ip, requestCount, set, reason}) => {
    const query = db.prepare(`
        INSERT INTO blacklist (ip, request_count, scanned_ports, scanned_port_count, reason, banned_date)
        VALUES (@ip, @requestCount, @scannedPorts, @scannedPortCount, @reason, CURRENT_TIMESTAMP)
        ON CONFLICT (ip) DO UPDATE SET
            ip = excluded.ip,
            request_count = @requestCount,
            scanned_ports = @scannedPorts,
            scanned_port_count = @scannedPortCount,
            reason = @reason,
            is_threat = 1,
            banned_date = CURRENT_TIMESTAMP;
    `);

    const scannedPortCount = set.size;
    const scannedPorts = JSON.stringify([...set])

    return query.run({
        ip,
        requestCount,
        scannedPorts,
        scannedPortCount,
        reason,
    });
}

export const checkBlacklist = (ip) => {
    const query = db.prepare(`
        SELECT id, is_threat 
        FROM blacklist
        WHERE ip = @ip;
    `);

     const result = query.get({ip});

     if (!result) {
         return false;
     } else {
         const isThreat = Boolean(result.is_threat);
         return isThreat;
     }
}

export const getOverviewStats = () => {
    const totalLogs = db.prepare(`SELECT COUNT(*) as total FROM logs`).get().total;

    const protocolCounts = db.prepare(`
        SELECT protocol, COUNT(*) as count 
        FROM logs 
        GROUP BY protocol
    `).all();

    const totalBlacklisted = db.prepare(`
        SELECT COUNT(*) as total FROM blacklist WHERE is_threat = 1
    `).get().total;

    const last24Hours = db.prepare(`
        SELECT COUNT(*) as count 
        FROM logs 
        WHERE started_at >= datetime('now', '-1 day')
    `).get().count;

    return {
        totalAttacks: totalLogs,
        last24Hours,
        totalBlacklisted,
        protocols: protocolCounts.reduce((acc, curr) => {
            acc[curr.protocol] = curr.count;
            return acc;
        }, { ssh: 0, telnet: 0, http: 0 })
    };
};

export const getTopCredentials = (limit = 10) => {
    const topUsernames = db.prepare(`
        SELECT username, COUNT(*) as count FROM (
            SELECT attempted_username as username FROM ssh_details WHERE attempted_username IS NOT NULL AND attempted_username != ''
            UNION ALL
            SELECT attempted_username as username FROM telnet_details WHERE attempted_username IS NOT NULL AND attempted_username != ''
        )
        GROUP BY username
        ORDER BY count DESC
        LIMIT ?
    `).all(limit);

    const topPasswords = db.prepare(`
        SELECT password, COUNT(*) as count FROM (
            SELECT attempted_password as password FROM ssh_details WHERE attempted_password IS NOT NULL AND attempted_password != ''
            UNION ALL
            SELECT attempted_password as password FROM telnet_details WHERE attempted_password IS NOT NULL AND attempted_password != ''
        )
        GROUP BY password
        ORDER BY count DESC
        LIMIT ?
    `).all(limit);

    return { topUsernames, topPasswords };
};

export const getTopAttackerIps = (limit = 10) => {
    return db.prepare(`
        SELECT source_ip, COUNT(*) as attack_count, 
               MIN(started_at) as first_seen, 
               MAX(started_at) as last_seen
        FROM logs
        GROUP BY source_ip
        ORDER BY attack_count DESC
        LIMIT ?
    `).all(limit);
};

export const getRecentCommands = (limit = 30) => {
    const rows = db.prepare(`
        SELECT l.source_ip, l.protocol, s.commands_executed, l.started_at
        FROM logs l
        JOIN ssh_details s ON l.id = s.log_id
        WHERE s.commands_executed IS NOT NULL AND s.commands_executed != '[]' AND s.commands_executed != '{}'
        UNION ALL
        SELECT l.source_ip, l.protocol, t.commands_executed, l.started_at
        FROM logs l
        JOIN telnet_details t ON l.id = t.log_id
        WHERE t.commands_executed IS NOT NULL AND t.commands_executed != '[]' AND t.commands_executed != '{}'
        ORDER BY started_at DESC
        LIMIT ?
    `).all(limit);

    const parsedCommands = [];
    for (const row of rows) {
        try {
            const cmds = typeof row.commands_executed === 'string'
                ? JSON.parse(row.commands_executed)
                : row.commands_executed;

            if (Array.isArray(cmds)) {
                for (const item of cmds) {
                    parsedCommands.push({
                        ip: row.source_ip,
                        protocol: row.protocol,
                        command: item.command,
                        executedAt: item.executed_at || row.started_at
                    });
                }
            }
        } catch {}
    }

    return parsedCommands.slice(0, limit);
};

export const getThreatfulBlacklistLogs = () => {
    return db.prepare(`
        SELECT ip, request_count, scanned_ports, reason, banned_date 
        FROM blacklist 
        WHERE is_threat = 1
        ORDER BY banned_date DESC
    `).all();
};

export const getBlacklistedIps = () => {
    const query = db.prepare(`
        SELECT id, ip, reason, request_count, scanned_ports, banned_date
        FROM blacklist 
        ORDER BY banned_date DESC;
    `);
    return query.all();
};

export const removeBlacklistIp = (ip) => {
    const query = db.prepare(`
        DELETE FROM blacklist 
        WHERE ip = ?;
    `);
    return query.run(ip);
};