import { checkBlacklist } from "../../db/database.js";

export function isBlacklisted(ip) {
    return checkBlacklist(ip);
}