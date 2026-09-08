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
            commands_executed TEXT,
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

const insertLog = ({sourceIp, sourcePort, targetPort, protocol}) => {
    const prepareLogTable = db.prepare(`
        INSERT INTO logs (source_ip, source_port, target_port, protocol)
        VALUES (@sourceIp, @sourcePort, @targetPort, @protocol);
    `);

    const result = prepareLogTable.run({sourceIp, sourcePort, targetPort, protocol});
    return result.lastInsertRowid;
}

export const addHttpLog = ({sourceIp, sourcePort, targetPort, method, headers, bodyPayload, url, responseStatus}) => {
    const id = insertLog({sourceIp: sourceIp, sourcePort: sourcePort, targetPort: targetPort, protocol: 'http'});

    const query = db.prepare(`
        INSERT INTO http_details (log_id, method, headers, body_payload, url, response_status)
        VALUES (@id, @method, @headers, @bodyPayload, @url, @responseStatus)
    `);

    return query.run({id, method, headers, bodyPayload, url, responseStatus});
}

export const addSshLog = ({sourceIp, sourcePort, targetPort, attemptedUsername, attemptedPassword, clientVersion, method, publicKeyFingerprint, rawPayload}) => {
    const id = insertLog({sourceIp:sourceIp, sourcePort: sourcePort, targetPort: targetPort, protocol: 'ssh'});

    const prepareSshTable = db.prepare(`
        INSERT INTO ssh_details (log_id, attempted_username, attempted_password, client_version, method, public_key_fingerprint, raw_payload)
        VALUES (@id, @attemptedUsername, @attemptedPassword, @clientVersion, @method, @publicKeyFingerprint, @rawPayload);
    `);

    return prepareSshTable.run({id, attemptedUsername, attemptedPassword, clientVersion, method, publicKeyFingerprint, rawPayload});
}

export const getAllLogs = () => {
    const query = db.prepare(`
        SELECT * FROM logs
        ORDER BY ended_at DESC;`
    );

    return query.all();
}

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

    return query.get({ip});
}