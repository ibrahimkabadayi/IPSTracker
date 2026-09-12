// src/honeypot/honeyTokens.js
import * as dotenv from 'dotenv';
dotenv.config();

export const HONEY_TOKENS = {
    BAIT_PASSWORD: process.env.BAIT_ROOT_PASSWORD || 'DefaultSuperPass2026!',
    BAIT_USER: process.env.BAIT_DB_USER || 'root'
};