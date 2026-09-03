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
            sourceIp TEXT NOT NULL,
            sourcePort INTEGER NOT NULL,
            targetPort INTEGER NOT NULL,
            protocol TEXT NOT NULL,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
            ended_at DATETIME
        ),
        CREATE TABLE IF NOT EXISTS http_details (
            log_id INTEGER NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
            method TEXT NOT NULL,
            headers JSON NOT NULL,
            body_payload JSON NULL,
            response_status INTEGER NOT NULL
        ),
        CREATE TABLE IF NOT EXISTS ssh_details (
            log_id INTEGER NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
            attempted_username TEXT NOT NULL,
            attempted_password  TEXT NOT NULL,
            client_version TEXT,
            auth_method TEXT,
            public_key_fingerprint TEXT,
            commands_executed TEXT,
            raw_payload JSON NOT NULL
        ),
        CREATE TABLE IF NOT EXISTS telnet_details (
            log_id INTEGER NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
            attempted_username TEXT NOT NULL,
            attempted_password  TEXT NOT NULL,
            commands_executed TEXT,
            raw_payload JSON NOT NULL
        )
    `);

    console.log('Database initialized.');
}

