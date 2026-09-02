import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'network.db');
const db = new Database(dbPath);

export const initDb = async () => {

}

